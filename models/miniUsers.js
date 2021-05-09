const setup = require('../setup.js');
const cache = require('../cache.js')(setup);
const esi = require('../swagger.js');
const usersDb = require('../dbHandler.js').db.collection('users');
const miniDb = require('../dbHandler.js').db.collection('miniUsers');
const log = require('../logger.js')(module);


module.exports = function (setup) {
	var module = {};


	module.createUser = function (data, cb) {
		miniDb.insert(data, function (err, result) {
			if (err) {
				log.error("createUser: Error for miniDb.insert", { err, name: data.name });
				return;
			}
			cb(data);
		})
	};

	module.connectAltToMain = function (mainData, altData, cb) {
		let main = mainData.name;
		let mainID = +mainData.ID;
		let alt = altData.name;
		let altID = +altData.ID;

		if (mainID == altID) {
			//status({ "type": "error", "message": "Error, you cannot link your main to itself." });
			cb("Cannot link main to itself" );
			return;
		}

		usersDb.find({ 'characterID': { $in: [mainID, altID] } }).toArray(onDbUsers);

		function onDbUsers(err, docs) {
			if (err) {
				log.error("connectAltToMain find: Error ", { err, main, alt });
				cb("DB error");
				return;
			}

			let mainObj, altObj;
			for (let p of docs) {
				if (p.name == main) mainObj = p;
				if (p.name == alt) altObj = p;
			}

			if (!mainObj) {

				miniDb.find({ 'characterID': mainID }).toArray(onDbMainUser);

				function onDbMainUser(err, docs) {
					if (err) {
						log.error("connectAltToMain find minu main: Error ", { err, main, alt });
						cb("DB error");
						return;
					}

					mainObj = docs[0];

					if (!mainObj) {
						createMain();
					} else {
						continue_alt();
					}
				}

				function createMain() {
					let data = {
						characterID: mainID,
						name: main,
						account: { main: true, linkedCharIDs: [] },
						registrationDate: new Date(),
					}

					module.createUser(data, function (userProfile, err) {
						if (err) {
							log.error("connectAltToMain createUser: Error ", { err, data });
							cb("DB error");
							return;
						}
						mainObj = userProfile;
						continue_alt();
					});
				}
			} else {
				continue_alt();
			}

			function continue_alt() {
				if (!altObj) {

					miniDb.find({ 'characterID': altID }).toArray(onDbAltUser);

					function onDbAltUser(err, docs) {
						if (err) {
							log.error("connectAltToMain find mini alt: Error ", { err, main, alt });
							cb("DB error");
							return;
						}

						altObj = docs[0];

						if (!altObj) {
							createAlt();
						} else {
							continue_connect();
						}
					}

					function createAlt() {
						let data = {
							characterID: altID,
							name: alt,
							account: { main: true, linkedCharIDs: [] },
							registrationDate: new Date(),
						}

						module.createUser(data, function (userProfile) {
							altObj = userProfile;
							continue_connect();
						});
					}
				} else {
					continue_connect();
				}
			}

			function continue_connect() {
				if (altObj.account && !altObj.account.main) {
					cb("This alt already belongs to someone");
					return;
				}

				if (altObj.account && altObj.account.main && altObj.account.linkedCharIDs && altObj.account.linkedCharIDs.length > 0) {
					cb("This alt is already a master account");
					return;
				}

				let main_db = usersDb;
				if (!mainObj.userVersion) main_db = miniDb;

				let alt_db = usersDb;
				if (!altObj.userVersion) alt_db = miniDb;


				alt_db.updateOne({ 'characterID': altID }, {
						//$unset: { role: 1, notes: 1, ships: 1, statistics: 1 },
						$set: { account:  { "main": false, "mainID": mainID, "mainName": main} }
					}, continue_update_main);

				function continue_update_main(err) {
					if (err) {
						log.error("connectAltToMain find: Error updating alt account", { err, main, alt });
						cb("DB error");
						return;
					}

					main_db.updateOne({ 'characterID': mainID }, {
							$push: { "account.linkedCharIDs": altID }
						}, function (err) {
							if (err) {
								log.error("connectAltToMain find: Error updating main account", { err, main, alt });
								cb("DB error");
								return;
							}

							cb(null);
						})
				}
			}
			
		}

	}


	module.findMultiple = function (ids, cb) {
		miniDb.find({ "characterID": { $in: ids } }).toArray(function (err, docs) {
			if (err) log.error("user.findMultiple: Error ", { err });
			cb(docs);
		})
	}

	module.reform1 = function () {
		miniDb.find({ "account.main" : false }).toArray(function (err, alts) {
			if (err) log.error("user.reform1: Error ", { err });

			let ids = alts.map(r => r.account.mainID);
			miniDb.find({ "characterID": { $in: ids } }).toArray(function (err, main_arr) {
				if (err) log.error("user.reform1 a: Error ", { err });

				console.log("updating " + main_arr.length);

				let mains = {};
				for (let m of main_arr) {
					mains[m.characterID] = m.name;
				}

				let it = 0;
				update_step();

				function update_step() {
					if (it >= alts.length) return;

					let alt = alts[it];
					++it;
					let id = alt.characterID;
					let mainId = alt.account.mainID;
					if (!mainId) { update_step(); return; }
					let main = mains[mainId];
					if (!main) { update_step(); return; }

					miniDb.updateOne({ 'characterID': id }, {
						//$unset: { role: 1, notes: 1, ships: 1, statistics: 1 },
						$set: { "account.mainName": main }
					}, update_step);
				}
			});


			usersDb.find({ "characterID": { $in: ids } }).toArray(function (err, main_arr) {
				if (err) log.error("user.reform1 b: Error ", { err });

				console.log("updating b " + main_arr.length);

				let mains = {};
				for (let m of main_arr) {
					mains[m.characterID] = m.name;
				}

				let it = 0;
				update_step();

				function update_step() {
					if (it >= alts.length) return;

					let alt = alts[it];
					++it;
					let id = alt.characterID;
					let mainId = doc.account.mainID;
					if (!mainId) { update_step(); return; }
					let main = mains[mainId];
					if (!main) { update_step(); return; }

					usersDb.updateOne({ 'characterID': id }, {
						//$unset: { role: 1, notes: 1, ships: 1, statistics: 1 },
						$set: { "account.mainName": main }
					}, update_step);
				}
			});
		})
	}

	return module;
}