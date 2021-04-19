const setup = require('../setup.js');
const db = require('../dbHandler.js').db.collection('newFleets');
const esi = require('../swagger.js');
const user = require('../models/user.js')(setup);
const log = require('../logger.js')(module);
const waitlist = require('./waitlist.js')(setup);
const cache = require('../cache.js')(setup);

module.exports = function (setup) {

    module.get = function(fleetID, cb){
		db.findOne({ 'id': '' + fleetID, closed: { $in: [null, false] } }, function (err, doc) {
			if (err) log.error("newFleets.get: Error for db.findOne", { err, fleetID });
			if (!doc) {
				log.error("newFleets.get: not found", { fleetID });
				cb(null)
			} else {
				cb(doc);
			}
		});
	}

	module.getFleetList = function (fleets) {
		db.find( { closed: {$in: [null, false]} } ).toArray(function (err, docs) {
			if (err) {
				log.error("newFleets.getFleetList: error getting the list of fleets", err);
				fleets(null);
				return;
			}

			fleets(docs);
		})
	}

	module.validate = function (characterID, fleetID, cb) {
		user.getRefreshToken(characterID, function (accessToken) {
			esi.characters(characterID, accessToken).fleet(fleetID).info().then(function (result) {
				if (result) cb(true);
				else cb(false);
			}).catch(function (err) {
				console.log(err)
				cb(false);
			});
		})
	}


    module.close = function(fleetID, cb){
		db.updateOne({ id: '' + fleetID, closed: { $in: [null, false] }}, { $set: {closed: true} }, function (err) {
			if (err){
                log.error("fleet.delete:", { "fleet id: ": fleetID, err });
                cb(false);
                return;
            } 
			cb(true);
		})
    }


    module.register = function(fleetObject, cb){
        db.insert(fleetObject, function (err, result) {
            if(err){
                log.error("fleets.register: error for db.insert - ", {"Fleet ID": fleetObject.id, "Fleet Commander": fleetObject.fc.name, err})
                cb(err);
                return;
            }
            cb(null);
        })
    }

	module.updateFleet = function (fleetID, fleetObj, data, callback) {
		for (let it in data) {
			fleetObj[it] = data[it];
		}

		db.updateOne({ id: '' + fleetID, closed: { $in: [null, false] } }, { $set: data }, function (err) {
			if (err) {
				log.error("newFleets.updateCommander: ", { "FC": fc.name, err });
				if (callback)
					callback(err);
				return;
			}

			if (callback)
				callback(null);
		})
	}



    return module;
}