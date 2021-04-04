const setup = require('../setup.js');
const user = require('../models/user.js')(setup);
const users = require('../models/users.js')(setup);
const fleets = require('../models/fleets.js')(setup);
const ESI2 = require('eve_swagger_interface');
const log = require('../logger.js')(module);

const ESI2_defaultClient = ESI2.ApiClient.instance;
const FleetsApi = new ESI2.FleetsApi();
const UniverseApi = new ESI2.UniverseApi();

function diffArray(arr1, arr2) {
	let a = new Set(arr1);
	let b = new Set(arr2);
	return [... new Set([...a].filter(x => !b.has(x)))];
}

/*
Move fleet member
Get fleet wings
Create fleet wing
Create fleet squad
 */
exports.index = function (req, res) {
	if (!users.isRoleNumeric(req.user, 1)) {
		req.flash("content", { "class": "error", "title": "Not Authorised!", "message": "Only FC has access to that page" });
		res.status(403).redirect('/commander');
		return;
	}

	let pageData = {};
	pageData.userProfile = req.user;
	pageData.sideBarSelected = 5;

//	getFleetMembers(req.params.fleetID, function (err, fleetData) {
//		if (err) {
//			renderError(err, res);
//			return;
//		}
//
//		let charIDs = fleetData.map(row => row.characterId);
//		
//		users.findMultiple(charIDs, function (users) {
//			onDBLoadUsers(users, charIDs, fleetData);
//		});
//		
//	}, { req, res });

//	function onDBLoadUsers(DBdata, charIDs, fleetData) {
//		if (!DBdata) {
//			renderError('db error', res);
//			return;
//		}
//
//		let foundIDs = DBdata.map(row => row.characterID);
//		let missingIDs = diffArray(charIDs, foundIDs);
//		if (missingIDs.length > 0) {
//			UniverseApi.postUniverseNames(missingIDs, {}, function (error, ESIdata) {
//				if (error) {
//					renderError('ESI error', res);
//					return;
//				}
//				onESILoadUsers(ESIdata, DBdata, fleetData);
//			});
//		} else {
//			onESILoadUsers(null, DBdata, fleetData);
//		}
//	}

//	function onESILoadUsers(ESIdata, DBdata, fleetData) {
//		try {
//
//			let names = {};
//
//			if (ESIdata) {
//				ESIdata.forEach(r => names[r.id] = r.name);
//			}
//
//			DBdata.forEach(r => names[r.characterID] = r.name);
//
//			let squads = {};
//
//			let pilots = [];
//			for (let row of fleetData) {
//				let joinTime = row.joinTime;
//				let shipTypeId = row.shipTypeId;
//				let solarSystemId = row.solarSystemId;
//				let squadId = row.squadId;
//				let stationId = row.stationId;
//
//				pilots.push({
//					name: names[row.characterId],
//					main: null,
//					squad: squads[row.squadId],
//					shipsSub: [],
//					shipsAll: [],
//					timeActive: '',
//					timeWaitlist: '',
//					timeTotal: '' + joinTime,
//					ship: '' + shipTypeId,
//					system: '' + solarSystemId,
//				});
//			}
//
//			renderPage(pilots);
//
//		} catch (e) {
//			renderError(e, res);
//		}
//	}

	renderPage();

	function renderError(error, res) {
		res.render('fcFleetNew.njk', { error, userProfile: pageData.userProfile, sideBarSelected: pageData.sideBarSelected });
	}

	function renderPage() {
		res.render('fcFleetNew.njk', {
			//pilots: JSON.stringify(pilots),
			fleetId: req.params.fleetID,
			userProfile: pageData.userProfile,
			sideBarSelected: pageData.sideBarSelected
		}); // fleet, usersOnWaitlist, comms
	}
}

//function getFleetMembers(fleetID, cb, reqResObj) {
//	fleets.get(fleetID, function (fleet) {
//		if (!fleet) {
//			cb("Fleet not Found");
//			return;
//		}
//
//		if (fleet && !fleet.fc.characterID) {
//			cb("Error");
//			return;
//		}
//
//		user.getRefreshToken(fleet.fc.characterID, onUserToken, reqResObj);
//	});
//
//	function onUserToken(accessToken) {
//		if (!accessToken) {
//			cb('no accessToken');
//			return;
//		}
//
//		var evesso = ESI2_defaultClient.authentications['evesso'];
//		evesso.accessToken = accessToken;
//
//		FleetsApi.getFleetsFleetIdMembers(fleetID, {}, onFleetData);
//	}
//		
//	function onFleetData(error, data) {
//		if (error) {
//			log.error('getFleetMembers', error);
//			cb('fleet error');
//			return;
//		}
//
//		cb(null, data);
//	};
//}




/*
exports.index = function (req, res) {
	if (!users.isRoleNumeric(req.user, 1)) {
		req.flash("content", { "class": "error", "title": "Not Authorised!", "message": "Only our FC team has access to that page! Think this is an error? Contact a member of leadership." });
		res.status(403).redirect('/commander');
		return;
	}

	fleets.get(req.params.fleetID, function (fleet) {
		if (!fleet) {
			req.flash("content", { "class": "info", "title": "Woops!", "message": "That fleet was deleted." });
			res.status(403).redirect('/commander');
			return;
		}

		waitlist.get(function (usersOnWaitlist) {
			var userProfile = req.user;
			var comms = setup.fleet.comms;
			var sideBarSelected = 5;
			res.render('fcFleetManage.njk', { userProfile, sideBarSelected, fleet, usersOnWaitlist, comms });
		})
	})
}

exports.invite = function (req, res) {
	if (!users.isRoleNumeric(req.user, 1)) {
		res.status(403).send("Not Authorised");
		return;
	}

	fleets.get(req.params.fleetID, function (fleet) {
		if (!fleet) {
			res.status(404).send("Fleet not Found");
			return;
		}

		if (fleet && !fleet.fc.characterID) {
			res.status(400).send("ESI Error: Offline Waitlist Mode.");
			return;
		}

		user.getRefreshToken(fleet.fc.characterID, function (accessToken) {
			esi.characters(fleet.fc.characterID, accessToken).fleet(req.params.fleetID).invite({ "character_id": req.params.characterID, "role": "squad_member" }).then(result => {
				wlog.invited(req.params.characterID, req.user.characterID);
				broadcast.alarm(req.params.characterID, req.params.fleetID, req.user, "invite");
				res.status(200).send();
			}).catch(error => {
				var resStr = error.message.split("'")[3];
				if (!resStr) {
					resStr = error.message.split("\"")[3];
				}

				res.status(400).send(resStr);
			});
		})
	})
}

exports.delete = function (req, res) {
	if (!users.isRoleNumeric(req.user, 1)) {
		req.flash("content", { "class": "error", "title": "Not Authorised!", "message": "Only our FC team has access to that page! Think this is an error? Contact a member of leadership." });
		res.status(403).redirect('/commander');
		return;
	}


	fleets.close(req.params.fleetID, function (cb) {
		res.status(cb).send();
	});
}

exports.getInfo = function (req, res) {
	if (!users.isRoleNumeric(req.user, 1)) {
		res.status(401).send("Not Authenticated");
		return;
	}

	fleets.get(req.params.fleetid, function (fleet) {
		if (!fleet) {
			res.status(404).send("Fleet Not Found");
			return;
		}
		res.status(200).send({
			"fc": {
				"characterID": fleet.fc.characterID,
				"name": fleet.fc.name
			},
			"backseat": {
				"characterID": fleet.backseat.characterID,
				"name": fleet.backseat.name
			},
			"type": fleet.type,
			"status": fleet.status,
			"comms": fleet.comms,
			"location": fleet.location
		});
	});

}

exports.updateBackseat = function (req, res) {
	if (!users.isRoleNumeric(req.user, 1)) {
		res.status(403).send("Not Authorised");
		return;
	}

	let backseatObject = { "characterID": req.user.characterID, "name": req.user.name };
	fleets.get(req.params.fleetID, function (fleet) {
		if (fleet.backseat.characterID == req.user.characterID || fleet.fc.characterID == req.user.characterID) {
			backseatObject = {
				"characterID": null,
				"name": null
			}
		}

		fleets.updateBackseat(fleet.id, backseatObject, function (result) {
			res.status(result).send();
		})
	})
}

exports.updateCommander = function (req, res) {
	if (!users.isRoleNumeric(req.user, 1)) {
		res.status(403).send("Not Authorised");
		return;
	}

	fleets.updateCommander(req.params.fleetID, req.user, function (result) {
		res.status(result).send();
	})
}

exports.updateComms = function (req, res) {
	if (!users.isRoleNumeric(req.user, 1)) {
		res.status(403).send("Not Authorised");
		return;
	}

	fleets.updateComms(req.params.fleetID, req.body.url, req.body.name, function (result) {
		res.status(result).send();
	})
}

exports.updateStatus = function (req, res) {
	if (!users.isRoleNumeric(req.user, 1)) {
		res.status(403).send("Not Authorised");
		return;
	}

	fleets.updateStatus(req.params.fleetID, req.body.status, function (result) {
		res.status(result).send();
	})
}

exports.updateType = function (req, res) {
	if (!users.isRoleNumeric(req.user, 1)) {
		res.status(403).send("Not Authorised");
		return;
	}

	fleets.updateType(req.params.fleetID, req.body.type, function (result) {
		res.status(result).send();
	})
}
*/
