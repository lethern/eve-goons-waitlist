const setup = require('../setup.js');
const user = require('../models/user.js')(setup);
const users = require('../models/users.js')(setup);
const newFleets = require('../models/newFleets.js')(setup);
const log = require('../logger.js')(module);
const raw_io = require('socket.io');
const ESI2 = require('eve_swagger_interface');
const logger = require('../logger.js');

const ESI2_defaultClient = ESI2.ApiClient.instance;
const FleetsApi = new ESI2.FleetsApi();
const UniverseApi = new ESI2.UniverseApi();

let gFleetsData = {};
let gIDNames = {};
let gUserNamesData = {};
let gIDNames_toLoad = new Set();

function diffArray(arr1, arr2) {
	let a = new Set(arr1);
	let b = new Set(arr2);
	return [... new Set([...a].filter(x => !b.has(x)))];
}


/*
 * fleet:
hasError
errorMsg
errorsCount
lastErrorDate

currentBoss
fc
accessToken
squads
toLoadSquads
 */

let io;

module.exports = function (http, port) {
	
	io = raw_io(http);

//	io.use((socket, next) => {
//		if (!socket.handshake.auth) {
//			return next(new Error("invalid auth"));
//		}
//
//		const username = socket.handshake.auth.username;
//		if (!username) {
//			return next(new Error("invalid username"));
//		}
//		socket.username = username;
//		next();
//	});

	io.on('connection', (socket) => {
		console.log('a user connected');

		socket.on('disconnect', () => {
			console.log('user disconnected');
		});

		socket.on('listenForFleet', (params) => {
			let fleetId = params.fleetId;
			if (!fleetId) return;

			console.log('listenForFleet: ' + fleetId);
			socket.join('fleet' + fleetId);

			//socket.broadcast.emit('ACK', fleetId);

			if (!gFleetsData[fleetId]) {
				fetchDBFleet(fleetId, _continue);
			} else {
				_continue();
			}

			function _continue() {
				if (gFleetsData[fleetId].hasError) {
					socket.emit('fleet_data', { error: gFleetsData[fleetId].errorMsg });
				}
			}
		});

		socket.on('getSquadsList', (params) => {
			let fleetId = params.fleetId;
			if (!fleetId) return;

			//socket.emit('squads_list', { error: 'test' });

			refreshFleetWings(fleetId,
				function (data) {
					socket.emit('squads_list', data);
				});
		});

		socket.on('resetError', (params) => {
			let fleetId = params.fleetId;
			if (!fleetId) return;

			if (!gFleetsData[fleetId]) return;

			newFleets.updateFleet(fleetId, gFleetsData[fleetId], {
				hasError: false,
				errorsCount: 0,
				errorMsg: null
			});
			
			console.log('resetError for ' + fleetId);
		});

		socket.on('setFleetConfig', (params) => {
			let fleetId = params.fleetId;
			if (!fleetId) return;

			if (!gFleetsData[fleetId]) return;

			if (params.currentBoss) {

				users.findByName(params.currentBoss, function (bossPilot) {
					if (!bossPilot) return;

					newFleets.updateFleet(fleetId, gFleetsData[fleetId], {
						currentBoss: params.currentBoss,
						fc: {
							characterID: bossPilot.characterID,
							name: bossPilot.name
						},
						accessToken: null
					}, (err) => {
							if (!err) {
								log.debug('Changed boss for fleet ' + fleetId + ' to ' + params.currentBoss);
								io.to('fleet' + fleetId).emit('squads_list', { currentBoss: params.currentBoss });
							}
					});

				});
			}

		});

		socket.on('moveMember', (params) => {
			let fleetId = params.fleetId;
			if (!fleetId) return;

			if (!gFleetsData[fleetId]) return;

			let squadId = params.squadId;
			let pilotId = params.pilotId;

			if (!squadId || !pilotId) return;

			var movement = new ESI2.PutFleetsFleetIdMembersMemberIdMovement();
			movement.squad_id = squadId;
			movement.role = "squad_member";
			movement.wing_id = getWingIdFromSquad(fleetId, squadId);

			var evesso = ESI2_defaultClient.authentications['evesso'];
			evesso.accessToken = gFleetsData[fleetId].accessToken;

			FleetsApi.putFleetsFleetIdMembersMemberId(fleetId, pilotId, movement, {}, moveCallback);

			function moveCallback(error) {
				if (error) {
					log.error('ESI moveMember error', error);
					return;
				}
			}
		});

	});

	const refresh_time = 6 * 1000;
	setInterval(refreshFleets, refresh_time);
	log.info('Websocket set, refreshFleets started at ' + refresh_time);
};

function fetchDBFleet(fleetId, callback) {
	newFleets.get(fleetId, (fleet) => {
		if (!fleet) {
			return;
		}

		if (!gFleetsData[fleetId]) {
			gFleetsData[fleetId] = fleet;
		}
		callback();
	});
}

function getWingIdFromSquad(fleetId, squadId) {
	let squad = gFleetsData[fleetId].squads[squadId];
	if (!squad) return null;

	return squad.wing_id;
}

function refreshFleets() {
	if (io.engine.clientsCount == 0) {
		return;
	}

	for (let fleetId in gFleetsData) {
		let fleet = gFleetsData[fleetId];
		if (fleet.hasError) continue;

		if (fleet.accessToken && !fleet.fc && fleet.toLoadSquads) {
			fleet.toLoadSquads = false;
			refreshFleetWings(fleetId);
		}

		refreshFleet(fleetId);
	}

	if (gIDNames_toLoad.size > 0) {
		loadIDNames();
	}
}

function loadIDNames() {
	let IDsArray = Array.from(gIDNames_toLoad);
	gIDNames_toLoad.clear();

//	console.log('>> loadIDNames ' + IDsArray.length);
	
	UniverseApi.postUniverseNames(IDsArray, {}, function (error, ESIdata) {
		if (error) {
			log.error('ESI universeNames error', error);
			return;
		}
		ESIdata.forEach(r => {
			gIDNames[r.id] = r.name;
		});
	});
}

/*

//gSolarSystems_toLoad
function loadSolarSystems() {
	let IDsArray = Array.from(gIDNames_toLoad);
	gIDNames_toLoad.clear();

	onError('>> loadSolarSystems ' + IDsArray.length);

	UniverseApi.getUniverseSystemsSystemId(IDsArray, {}, function (error, ESIdata) {
		if (error) {
			onError('ESI universeNames error', error);
			return;
		}
		ESIdata.forEach(r => {
			gIDNames[r.id] = r.name;
		});
	});

	UniverseApi.(systemId, opts, callback);

}
*/

function checkFleetToken(fleetId, callback, onError) {
	if (!gFleetsData[fleetId].accessToken) {
		getAccessToken();
		return false;
	}

	return true;


	function getAccessToken() {
		user.getRefreshToken(gFleetsData[fleetId].fc.characterID, onUserToken);
	}

	function onUserToken(foundAccessToken) {
		if (!foundAccessToken) {
			onError('Fleet Boss Auth error (accessToken)');
			return;
		}

		newFleets.updateFleet(fleetId, gFleetsData[fleetId], {
			accessToken: foundAccessToken,
		}, (err) => {
			if (!err) {
				callback();
			}
		});
	}
}

function refreshFleet(fleetId) {
	if (!checkFleetToken(fleetId, prepareReadFleet, onError)) return;

//	console.log('prepareReadFleet');
	prepareReadFleet();
	return;


	function prepareReadFleet() {
		if (!gFleetsData[fleetId].squads) {
			refreshFleetWings(fleetId);
			return;
		}

		onReadFleet();
	}

	function onReadFleet() {
		var evesso = ESI2_defaultClient.authentications['evesso'];
		evesso.accessToken = gFleetsData[fleetId].accessToken;

		FleetsApi.getFleetsFleetIdMembers(fleetId, {}, onFleetData);
	}

	function onFleetData(error, fleetData) {
		if (error) {
			log.error('getFleetMembers', error);

			let extraErrorInfo = '';
			if (error.status == 403 && error.response && error.response.text) {
				if ((error.response.text.includes && error.response.text.includes('sso_status'))
					|| (error.response.text.includes && error.response.text.includes('token is expired'))
				) {
					log.info('reseting token');
					gFleetsData[fleetId].accessToken = null;
				} else {
					extraErrorInfo = error.response.text;
					log.info('? ' + error.response.text);
				}
			}

			if (error.status == 403 && error.response && error.response.text) {
				if (( error.response.text["sso_status"] == 401)
					|| (error.response.text["error"] == 'token is expired')
				) {
					log.info('reseting token2222');
					gFleetsData[fleetId].accessToken = null;
				}
			}

			if (error.status == 403 && error.response && error.response.text) {
				if (error.response.text.includes && error.response.text.includes('The fleet does not exist or')) {
					onKnownError('The fleet does not exist or fleet Boss changed');
					return;
				}
			}


			if (error.response && error.response.text) {
				extraErrorInfo = error.response.text;
			}

			onError('ESI fleet error ' + extraErrorInfo);
			return;
		}

		let charIDs = fleetData.map(row => row.characterId);

		let foundIDs = charIDs.filter(x => !!gUserNamesData[x]);
		let missingIDs = diffArray(charIDs, foundIDs);

		if (missingIDs.length) {
//			console.log('>> users.findMultiple');
			users.findMultiple(missingIDs, function (users) {
				onDBLoadUsers(users, missingIDs, fleetData);
			});
		} else {
//			console.log('onFleetData -> onESILoadUsers');
			prepareFleetData(fleetData);
		}
	};

	function onDBLoadUsers(DBdata, charIDs, fleetData) {
		if (!DBdata) {
			onError('onDBLoadUsers error');
			return;
		}

		DBdata.forEach(r => gUserNamesData[r.characterID] = r.name);

		let foundIDs = DBdata.map(row => row.characterID);
		let missingIDs = diffArray(charIDs, foundIDs);

		if (missingIDs.length > 0) {
			var evesso = ESI2_defaultClient.authentications['evesso'];
			evesso.accessToken = gFleetsData[fleetId].accessToken;

//			console.log('>> onDBLoadUsers -> postUniverseNames');
			UniverseApi.postUniverseNames(missingIDs, {}, function (error, ESIdata) {
				if (error) {
					onError('ESI universeNames error');
					return;
				}
				onESILoadUsers(ESIdata, fleetData);
			});
		} else {
//			console.log('onDBLoadUsers -> prepareFleetData');
			prepareFleetData(fleetData);
			//onESILoadUsers(null, DBdata, fleetData);
		}
	}

	function onESILoadUsers(ESIdata, fleetData) {
		ESIdata.forEach(r => gUserNamesData[r.id] = r.name);
		// db save
		// db save
		// db save

//		console.log('onESILoadUsers -> prepareFleetData');
		prepareFleetData(fleetData);
	}

	function prepareFleetData(rows) {
		try {
			let fleetData = gFleetsData[fleetId];
			let squads = fleetData.squads;

			let pilots = [];
			for (let row of rows) {
				let squad = squads[row.squadId];
				let squadName = '?';
				if (squad) squadName = squad.name;
				if (row.squadId == -1) squadName = row.roleName;//'Fleet commander';

				let squadChanging = 0;

				//let stationId = row.stationId;
				//let stationName = gIDNames[stationId] || stationId;

				let solarSystemId = row.solarSystemId;
				let solarName = gIDNames[solarSystemId] || solarSystemId;

				let shipId = row.shipTypeId;
				let shipName = gIDNames[shipId] || shipId;
				if (shipName.startsWith('Capsule')) shipName = 'Capsule'; // cut the long Capsule - Genolution 'Auroral' 197-variant

				let inFleet_mins = (new Date() - row.joinTime) / 60000;
				
				pilots.push({
					id: row.characterId,
					name: gUserNamesData[row.characterId],
					main: null,
					squad: squadName,
					squadChanging: squadChanging,
					shipsSub: [],
					shipsAll: [],
					timeActive: '',
					timeWaitlist: '',
					timeTotal: inFleet_mins,
					ship: shipName,
					system: solarName,
				});

				if (row.squadId != -1 && squads[row.squadId] === undefined) {
					fleetData.toLoadSquads = true;
				}
				if (solarSystemId > 0 && !gIDNames[solarSystemId]) {
					gIDNames_toLoad.add(solarSystemId);
				}
				if (shipId > 0 && !gIDNames[shipId]) {
					gIDNames_toLoad.add(shipId);
				}
				
			}

			emitFleetData(pilots);

		} catch (e) {
			log.error('prepareFleetData exception', e);
			onError('prepareFleetData exception');
		}
	}


	function emitFleetData(pilots) {
		io.to('fleet' + fleetId).emit('fleet_data', { pilots });
		//gFleetsData[fleetId].socket.emit('fleet_data', { pilots });
	}


	function onError(msg) {
		const ErrorTimeToClean = 5 * 60 * 1000;

		let errorsCount = gFleetsData[fleetId].errorsCount;
		if (gFleetsData[fleetId].lastErrorDate && (new Date() - gFleetsData[fleetId].lastErrorDate) > ErrorTimeToClean)
			errorsCount = 0;

		errorsCount++;
		let lastErrorDate = new Date();
		let hasError = gFleetsData[fleetId].hasError;
		let errorMsg = undefined;

		if (gFleetsData[fleetId].errorsCount >= 5) {
			log.error('max error (5) for fleetId=' + fleetId, msg);
			hasError = true;
			errorMsg = msg;

			io.to('fleet' + fleetId).emit('fleet_data', { error: msg });
		}

		newFleets.updateFleet(fleetId, gFleetsData[fleetId], {
			errorsCount,
			lastErrorDate,
			hasError,
			errorMsg
		});
	}

	function onKnownError(msg) {

		newFleets.updateFleet(fleetId, gFleetsData[fleetId], {
			errorsCount: 5,
			hasError: true,
			errorMsg: msg
		});

		io.to('fleet' + fleetId).emit('fleet_data', { error: msg });
	}
};




function refreshFleetWings(fleetId, callback) {
	if (!checkFleetToken(fleetId, getFleetWings, onError)) {
		return;
	}

	getFleetWings();
	return;

	function getFleetWings() {
		var evesso = ESI2_defaultClient.authentications['evesso'];
		evesso.accessToken = gFleetsData[fleetId].accessToken;

//		console.log('>> refreshFleetWings -> getFleetsFleetIdWings');
		FleetsApi.getFleetsFleetIdWings(fleetId, {}, onWingsData);
	};

	function onWingsData(error, data) {
		if (error) {
			log.error('getFleetsFleetIdWings', error);
			onError('ESI fleet wings error');
			return;
		}

		let squads = {};
		gFleetsData[fleetId].squads = squads;

		for (let wing of data) {
			// wing.id, wing.name, wing.squads
			for (let squad of wing.squads) {
				squads[squad.id] = {
					name: squad.name, wing: wing.name, wing_id: wing.id,
				};
			}
		}

		newFleets.updateFleet(fleetId, gFleetsData[fleetId], {
				squads
			});

		let currentBoss = gFleetsData[fleetId].currentBoss;
		if (callback) callback({ squads, currentBoss });
	}

	function onError(error) {
		log.error('refreshFleetWings: ', error);
		if (callback) callback({ error: (error.message ? error.message : error) });
	};
}



/*
 -musimy dodac session id -> moze byc ustawiany wtedy gdy refreshToken 
   (jesli w danej chwili nie ma session id, to jest ustawiany od razu, tylko trzeba zapisac)
 -WS musi odeslac nam przy connect session id, zebysmy dokonali autoryzacji (user vs session)
 -drugie w kolejnosci, to ta osoba musi albo miec super uprawnienia, albo byc fleet FC / backup FC
1. zapisywac mape flot, w niej accessToken
2. jesli jest blad, to nullowac accessToken
 (chyba ze blad invalid token, to trzeba przerwac) (w innym przypadku, sprobowac ponownie)
3. jesli pusty, to refresh Token
-tworzymy pokoj na id fleet
-kazdy klient dolacza do pokoju i wysyla prosbe o full info

 
 */