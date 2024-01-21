const express = require('express');
const cors = require('./cors');
const Favorite = require('../models/favorite');
const Campsite = require('../models/campsite');
const authenticate = require('../authenticate');

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
    .post(
        cors.corsWithOptions,
        authenticate.verifyUser,
        authenticate.verifyAdmin,
        (req, res, next) => {
            Favorite.findOne({ user: req.user._id }).then((favorite) => {
                if (favorite) {
                    req.body.forEach((fav) => {
                        if (
                            favorite.campsites.some((campsite) =>
                                campsite._id.equals(fav._id)
                            )
                        ) {
                            console.log('Campsite already exists');
                        } else {
                            favorite.campsites.push(fav._id);
                            favorite.save().then((favorite) => {
                                res.statusCode = 200;
                                res.setHeader(
                                    'Content-Type',
                                    'application/json'
                                );
                                res.json(favorite);
                            });
                        }
                    });
                } else {
                    Favorite.create({
                        user: req.user._id,
                        campsites: req.body,
                    }).then((favorite) => {
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.json(favorite);
                    });
                }
            });
        }
    )
    .put(
        cors.corsWithOptions,
        authenticate.verifyUser,
        authenticate.verifyAdmin,
        (req, res) => {
            res.statusCode = 403;
            res.end('PUT operation not supported on /favorite');
        }
    )
    .delete(
        cors.corsWithOptions,
        authenticate.verifyUser,
        authenticate.verifyAdmin,
        (req, res) => {
            Favorite.findOneAndDelete({ user: req.user._id }).then(
                (deletedDoc) => {
                    if (deletedDoc) {
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.json(deletedDoc);
                    } else {
                        res.setHeader('Content-Type', 'text/plain');
                        res.end('You do not have any favorites to delete');
                    }
                }
            );
        }
    );

favoriteRouter
    .route('/:campsiteId')
    .options(cors.corsWithOptions, (req, res) => res.sendStatus(200))
    .get(cors.cors, (req, res, next) => {
        res.statusCode = 403;
        res.end('GET operation not supported on /favorite');
    })
    .post(
        cors.corsWithOptions,
        authenticate.verifyUser,

        (req, res) => {
            const campsiteId = req.params.campsiteId;
            Favorite.findOne({ user: req.user._id })
                .then((favorite) => {
                    favorite.campsites.forEach((favoriteCampsiteId) => {
                        if (favoriteCampsiteId.equals(campsiteId)) {
                            res.statusCode = 200;
                            res.setHeader('Content-Type', 'text/plain');
                            res.end('Campsite already exists');
                        } else {
                            Campsite.findById(campsiteId).then((campsite) => {
                                if (campsite) {
                                    favorite.campsites.push(campsiteId);
                                    favorite
                                        .save()
                                        .then((response) => {
                                            res.statusCode = 200;
                                            res.setHeader(
                                                'Content-Type',
                                                'application/json'
                                            );
                                            res.json(response);
                                        })
                                        .catch((err) => next(err));
                                } else {
                                    res.statusCode = 404;
                                    res.setHeader('Content-Type', 'text/plain');
                                    res.end('Campsite not found');
                                }
                            });
                        }
                    });
                })
                .catch((err) => next(err));
        }
    )
    .put(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
        res.statusCode = 403;
        res.end('PUT operation not supported on /favorite/:campsiteId');
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
                }
            })
            .catch((err) => next(err));
    });

module.exports = favoriteRouter;
