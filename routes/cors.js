const cors = require('cors');

const whitelist = ['http://localhost:3000', 'https://localhost:3443'];
const corsOptionsDelegate = (req, callback) => {
    let corsOPtions;
    console.log(req.header('Origin'));
    if (whitelist.indexOf(req.header('Origin')) !== -1) {
        corsOPtions = { origin: true };
    } else {
        corsOPtions = { origin: false };
    }
    callback(null, corsOPtions);
};

exports.cors = cors();
exports.corsWithOptions = cors(corsOptionsDelegate);

