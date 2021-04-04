const setup = require('../setup.js');
const user = require('../models/user.js')(setup);
const users = require('../models/users.js')(setup);
const fleets = require('../models/fleets.js')(setup);
const log = require('../logger.js')(module);
const raw_io = require('socket.io');
const ESI2 = require('eve_swagger_interface');

const ESI2_defaultClient = ESI2.ApiClient.instance;
const FleetsApi = new ESI2.FleetsApi();

let gIsWSgood = false;
let gHasWSerror = false;
let gFleetsData = {};
let gUserNamesData = {};

function diffArray(arr1, arr2) {
	let a = new Set(arr1);
	let b = new Set(arr2);
	return [... new Set([...a].filter(x => !b.has(x)))];
}


module.exports = function (http, port) {
	
	const io = raw_io(http);

	io.use((socket, next) => {
		if (!socket.handshake.auth) {
			return next(new Error("invalid auth"));
		}

		const username = socket.handshake.auth.username;
		if (!username) {
			return next(new Error("invalid username"));
		}
		socket.username = username;
		next();
	});

	io.on('connection', (socket) => {
		console.log('a user connected');

		socket.on('disconnect', () => {
			console.log('user disconnected');

			if (Object.keys(io.of("/").sockets).length == 0) {
				gIsWSgood = false;
			}
		});

		socket.on('listenForFleet', (params) => {
			let fleetId = params.fleetId;
			if (!fleetId) return;

			console.log('listenForFleet: ' + fleetId);

			socket.broadcast.emit('ACK', fleetId);

			if (!gFleetsData[fleetId]) {
				gFleetsData[fleetId] = {};
				////// TODO zamienic na session id
				////// TODO zamienic na session id
				////// TODO zamienic na session id
			}
			gFleetsData[fleetId].socket = socket;
			gIsWSgood = true;
		});

	});

	

	log.info('Websocket set');
};

function refreshFleets() {
	if (!gIsWSgood || gHasWSerror) return;

	log.info('fleet refresh');

	for (let fleetID in gFleetsData) {
		refreshFleet(fleetID);
	}
}


function refreshFleet(fleetID) {
	if (!gFleetsData[fleetID].accessToken) {
		if (!gFleetsData[fleetID].fleet || !gFleetsData[fleetID].fleet.fc) {
			console.log('fleets.get');
			fleets.get(fleetID, onFleetDB);
			return;
		}
		console.log('getAccessToken');
		getAccessToken();
		return;
	}

	console.log('prepareReadFleet');
	prepareReadFleet();
	return;

	function onFleetDB(foundFleet) {
		if (!foundFleet) {
			onError("Fleet not found in DB");
			return;
		}

		if (foundFleet && !foundFleet.fc.characterID) {
			onError("Fleet DB data incorrect");
			return;
		}

		console.log('onFleetDB -> getAccessToken');

		gFleetsData[fleetID].fleet = foundFleet;
		getAccessToken();
	}

	function getAccessToken() {
		user.getRefreshToken(gFleetsData[fleetID].fleet.fc.characterID, onUserToken);
	}

	function onUserToken(foundAccessToken) {
		if (!foundAccessToken) {
			onError('accessToken error');
			return;
		}

		gFleetsData[fleetID].accessToken = foundAccessToken;
		// db save
		// db save
		// db save
		// db save
		prepareReadFleet();
	}

	function prepareReadFleet() {
		if (!gFleetsData[fleetID].squads) {
			var evesso = ESI2_defaultClient.authentications['evesso'];
			evesso.accessToken = gFleetsData[fleetID].accessToken;

			console.log('prepareReadFleet -> getFleetsFleetIdWings');
			FleetsApi.getFleetsFleetIdWings(fleetID, {}, onWingsData);
			return;
		}

		console.log('prepareReadFleet -> onReadFleet');
		onReadFleet();
	}

	function onWingsData(error, data) {
		if (error) {
			log.error('getFleetsFleetIdWings', error);
			onError('ESI fleet wings error');
			return;
		}

		let squads = {};
		gFleetsData[fleetID].squads = squads;

		for (let wing of data) {
			// wing.id, wing.name, wing.squads
			for (let squad of wing.squads) {
				squads[squad.id] = { name: squad.name, wing: wing.name, wing_id: wing.id };
			}
		}

		console.log('onWingsData -> onReadFleet');
		onReadFleet();
	}

	function onReadFleet() {
		var evesso = ESI2_defaultClient.authentications['evesso'];
		evesso.accessToken = gFleetsData[fleetID].accessToken;

		FleetsApi.getFleetsFleetIdMembers(fleetID, {}, onFleetData);
	}

	function onFleetData(error, fleetData) {
		if (error) {
			log.error('getFleetMembers', error);
			onError('ESI fleet error');
			return;
		}

		let charIDs = fleetData.map(row => row.characterId);

		let foundIDs = charIDs.filter(row => !!gUserNamesData[row.characterID]);
		let missingIDs = diffArray(charIDs, foundIDs);

		if (missingIDs.length) {
			users.findMultiple(missingIDs, function (users) {
				onDBLoadUsers(users, missingIDs, fleetData);
			});
		} else {
			console.log('onFleetData -> onESILoadUsers');
			onESILoadUsers(null, null, fleetData);
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
			evesso.accessToken = gFleetsData[fleetID].accessToken;

			console.log('onDBLoadUsers -> postUniverseNames');
			UniverseApi.postUniverseNames(missingIDs, {}, function (error, ESIdata) {
				if (error) {
					onError('ESI universeNames error');
					return;
				}
				onESILoadUsers(ESIdata, fleetData);
			});
		} else {
			console.log('onDBLoadUsers -> prepareFleetData');
			prepareFleetData(fleetData);
			//onESILoadUsers(null, DBdata, fleetData);
		}
	}

	function onESILoadUsers(ESIdata, fleetData) {
		ESIdata.forEach(r => gUserNamesData[r.id] = r.name);
		// db save
		// db save
		// db save

		console.log('onESILoadUsers -> prepareFleetData');
		prepareFleetData(fleetData);
	}

	function prepareFleetData(fleetData) {
		try {
			let squads = gFleetsData[fleetID].squads;

			let pilots = [];
			for (let row of fleetData) {
				let joinTime = row.joinTime;
				let shipTypeId = row.shipTypeId;
				let solarSystemId = row.solarSystemId;
				let squad = squads[row.squadId];
				let squadName = '?';
				if (squad) squadName = squad.name;
				if (row.squadId == -1) squadName = 'Fleet commander';
				let stationId = row.stationId;

				pilots.push({
					name: gUserNamesData[row.characterId],
					main: null,
					squad: squadName,
					shipsSub: [],
					shipsAll: [],
					timeActive: '',
					timeWaitlist: '',
					timeTotal: '' + joinTime,
					ship: '' + shipTypeId,
					system: '' + solarSystemId,
				});
			}

			console.log('prepareFleetData -> emitFleetData');
			emitFleetData(pilots);

		} catch (e) {
			onError(e);
		}
	}


	function emitFleetData(pilots) {
		if (!gIsWSgood || gHasWSerror) return;
		if (!gFleetsData[fleetID].socket) return;

		console.log('emit');
		gFleetsData[fleetID].socket.emit('fleet_data', { pilots });
		gIsWSgood = false;
	}

	function onError(msg) {
		console.log('error');
		gHasWSerror = true;
	}
};

setInterval(refreshFleets, 6000);


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