const express = require('express');
const cors = require('./cors');
const Favorite = require('../models/favorite');
const Campsite = require('../models/campsite');
const authenticate = require('../authenticate');
const mongoose = require('mongoose');

const favoriteRouter = express.Router();

favoriteRouter
    .route('/')
    .options(cors.corsWithOptions, (req, res) => res.sendStatus(200))
    .get(cors.cors, authenticate.verifyUser, (req, res, next) => {
        Favorite.find({ user: req.user._id })
            .populate('user')
            .populate('campsite')
            .then((favorites) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(favorites);
            })
            .catch((err) => next(err));
    })
    .post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
        // Extract campsite IDs from the request body
        const campsiteIds = req.body.map((fav) => fav._id);

        // Use findOneAndUpdate with $addToSet to add non-duplicate campsite IDs
        Favorite.findOneAndUpdate(
            { user: req.user._id },
            { $addToSet: { campsites: { $each: campsiteIds } } },
            { new: true, upsert: true } // upsert: true creates a new Favorite if it doesn't exist
        )
            .then((favorite) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(favorite);
            })
            .catch((err) => next(err));
    })
    .put(cors.corsWithOptions, authenticate.verifyUser, (req, res) => {
        res.statusCode = 403;
        res.end('PUT operation not supported on /favorite');
    })
    .delete(cors.corsWithOptions, authenticate.verifyUser, (req, res) => {
        Favorite.findOneAndDelete({ user: req.user._id }).then((deletedDoc) => {
            res.statusCode = 200;
            if (deletedDoc) {
                res.setHeader('Content-Type', 'application/json');
                res.json(deletedDoc);
            } else {
                res.setHeader('Content-Type', 'text/plain');
                res.end('You do not have any favorites to delete');
            }
        });
    });

favoriteRouter
    .route('/:campsiteId')
    .options(cors.corsWithOptions, (req, res) => res.sendStatus(200))
    .get(cors.cors, (req, res, next) => {
        res.statusCode = 403;
        res.end('GET operation not supported on /favorite/:campsiteId');
    })
    .post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
        const campsiteId = req.params.campsiteId;

        // Check if the campsiteId is a valid ObjectId
        // I need this becuase if the string is not in the format of
        // a mongoose objectId it will throw a cast error
        if (!mongoose.Types.ObjectId.isValid(campsiteId)) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/plain');
            res.end('Invalid campsite ID');
            return;
        }

        // Then this checks that the properly formatted ID actually exists before proceeding.
        Campsite.findById(campsiteId)
            .then((campsite) => {
                if (!campsite) {
                    res.statusCode = 404;
                    res.setHeader('Content-Type', 'text/plain');
                    res.end('Campsite not found');
                    return;
                }
                // Now we know the campsite exists, find or create the favorite
                return Favorite.findOne({ user: req.user._id });
            })
            .then((favorite) => {
                if (favorite && favorite.campsites.includes(campsiteId)) {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'text/plain');
                    res.end('Campsite is already in the list of favorites');
                    return;
                }
                return Favorite.findOneAndUpdate(
                    { user: req.user._id },
                    { $addToSet: { campsites: campsiteId } },
                    { new: true, upsert: true }
                );
            })
            .then((favorite) => {
                if (favorite) {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(favorite);
                }
            })
            .catch((err) => next(err));
    })
    .put(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
        res.statusCode = 403;
        res.end(
            `PUT operation not supported on /favorite/${req.params.campsiteId}`
        );
    })
    .delete(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
        const campsiteId = req.params.campsiteId;
        Favorite.findOne({ user: req.user._id })
            .then((favorite) => {
                if (favorite) {
                    const newFilteredFavs = favorite.campsites.filter(
                        (campsite) => !campsite._id.equals(campsiteId)
                    );
                    favorite.campsites = newFilteredFavs;
                    favorite.save().then((response) => {
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.json(response);
                    });
                } else {
                    res.statusCode = 404;
                    res.setHeader('Content-Type', 'text/plain');
                    res.end('You do not have any favorites to delete');
                }
            })
            .catch((err) => next(err));
    });

module.exports = favoriteRouter;
