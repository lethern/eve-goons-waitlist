const setup = require('./setup.js');
const mongo = require('mongodb').MongoClient;
const log = require('./logger.js')(module);

//const MONGODB_URL = setup.data.mongoDbURL || process.env.MONGODB_URL ||'mongodb://localhost:27017';
const dbSettings = setup.dbSettings;
const MONGODB_URL = "mongodb+srv://" + dbSettings.USER + ':' + dbSettings.PASS + '@' + dbSettings.HOST;//+'/'+process.env.DB+"?retryWrites=true&w=majority";

const absorbInitialConnectError = function absorbInitialConnectError(cb, database) {
	mongo.connect(MONGODB_URL, function (err, client) {
		if (err) {
			log.error('Database connection failure', { err });
			if (err.message && err.message.match(/failed to connect to server .* on first connect/)) {
				setTimeout(absorbInitialConnectError.bind(null, cb, dbService), 2000);
			}
		} else {
			if (database !== undefined) {
				database.db = client.db(dbSettings.DB);
			} else {
				dbService.db = client.db(dbSettings.DB);
			}
			log.info("Database connection successful.");
			cb();
		}
	});
};

const dbService = {connect: absorbInitialConnectError};

module.exports = dbService;