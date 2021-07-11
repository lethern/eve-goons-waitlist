const setup = require('../setup.js');
const user = require('../models/user.js')(setup);
const users = require('../models/users.js')(setup);
const _log = require('../logger.js')(module);
const ESI2 = require('eve_swagger_interface');
const cache = require('../cache.js')(setup);
const cacheContracts = require('../cacheContracts.js')(setup);


const ESI2_defaultClient = ESI2.ApiClient.instance;
const ContractsApi = new ESI2.ContractsApi();
const UniverseApi = new ESI2.UniverseApi();

module.exports = { run };

let gContracts = {};
let log = createLogger();
let _logRing = [];
let logRing = createLogRing();

function run() {
	log.info("contracts: Start");

	contracts_impl()
		.then(res => {
			log.info("contracts: Active");
		})
		.catch((err, stuff) => {
			log.error("contracts: Error", err, stuff);
		});
}

async function contracts_impl() {
	let data = {};
	//data.characterID = 2112992068; // Jagger01
	data.characterID = 2116514898; // SARS-CoV-2 - Logarm's alt
	data.corporationId = 98119924; // dgiad

	data.accessToken = await refreshToken(data.characterID);

	let page = 1;
	while (true) {
		let readContracts = await API_getContracts(data, page);
		let analysis = await analyseContracts(readContracts);

		if (!analysis.readMore) break;
		if (page >= analysis.pages) break;
		page++;
	}
}

async function refreshToken(characterID) {
	return new Promise(function (resolve, reject) {
		user.getRefreshToken(characterID, function (accessToken) {
			if (!accessToken) {
				reject("refreshToken: Could not get an accessToken");
			} else {
				resolve(accessToken);
			}
		});
	});
}


async function API_getContracts(data, page) {
	var evesso = ESI2_defaultClient.authentications['evesso'];
	evesso.accessToken = data.accessToken;

	return new Promise(function (resolve, reject) {
		if (page > 1) log.info("API_getContracts page " + page);
		else log.debug("API_getContracts page " + page);

		ContractsApi.getCorporationsCorporationIdContracts(data.corporationId, { 'page': page },
			function (error, resData, response) {
				if (error) {
					reject({ msg: "API_getContracts error ", name: error.name, stack: error.stack });
				} else {
					resolve({ resData, response });
				}
			});
	});
}

async function analyseContracts(readContracts) {
	let { resData, response } = readContracts;
	let missing = [];

	resData.forEach(row => {
		let contractId = row.contractId;
		if (!gContracts[contractId]) {
			missing.push(row);
		}
	});

	////////
	////////
	////////
	log.debug(`missing: ${missing.length} of ${resData.length}`);
	missing = missing.slice(0, 1);
	////////
	////////
	////////

	if (missing.length) {
		let data = analyseContracts_impl(missing);
		// raise event: new contracts
		let userDict = await getUsers(data.userIDs);
		contractsAddDetails(missing, userDict);
		await getContractShips(data.contractIds);
	}


	let pages = +(response.header['x-pages']);
//	other.date = response.header.date;
//	other.expires = response.header.expires;
//	other.lastmodified = response.header['last-modified'];
//	other.refreshMS = new Date(params.expires) - new Date(params.date);

	return {
		readMore: (missing.length && missing.length == resData.length),
		pages
	};
}

function analyseContracts_impl(resData) {
	/*
	acceptorId	Number	Who will accept the contract
	assigneeId	Number	ID to whom the contract is assigned, can be corporation or character ID
	availability	String	To whom the contract is available
	contractId	Number	contract_id integer
	dateAccepted	Date	Date of confirmation of contract	[optional]
	dateCompleted	Date	Date of completed of contract	[optional]
	dateIssued	Date	?reation date of the contract
	forCorporation	Boolean	true if the contract was issued on behalf of the issuer's corporation
	issuerCorporationId	Number	Character's corporation ID for the issuer
	issuerId	Number	Character ID for the issuer
	price	Number	Price of contract (for ItemsExchange and Auctions)	[optional]
	status	String	Status of the the contract
	title	String	Title of the contract	[optional]
	type	String	Type of the contract
	
	buyout	Number	Buyout price (for Auctions only)	[optional]
	collateral	Number	Collateral price (for Couriers only)	[optional]
	dateExpired	Date	Expiration date of the contract
	daysToComplete	Number	Number of days to perform the contract	[optional]
	endLocationId	Number	End location ID (for Couriers contract)	[optional]
	reward	Number	Remuneration for contract (for Couriers only)	[optional]
	startLocationId	Number	Start location ID (for Couriers contract)	[optional]
	volume	Number	Volume of items in the contract	[optional]
*/

	let userIDs = new Set();
	let contractIds = [];

	resData.forEach(row => {
		gContracts[row.contractId] = {
			origin: row,
//			dateIssued: row.dateIssued,

//			contractId: row.contractId,
//			dateIssuedStr: '',
//			issuer: '',
//			assignee: '',
//			ships: '',
//			price: row.price,
//			status: row.status,
//			type: row.type,
		}


		if (row.issuerId) {
			userIDs.add(row.issuerId);
		}

		if (row.acceptorId) {
			userIDs.add(row.acceptorId);
		}

		if (row.assigneeId) {
			userIDs.add(row.assigneeId);
		}


		if (!['cancelled', 'rejected', 'failed', 'deleted', 'reversed'].includes(row.status)) {
			// "outstanding", "in_progress", "finished_issuer", "finished_contractor", "finished"
			contractIds.push(row.contractId);
		}
	});

	return { userIDs, contractIds };
}


async function getUsers(userIDs) {
	return new Promise(function (resolve, reject) {
		cache.massGet(userIDs, (error, usersResult) => {
			if (error) {
				reject({ msg: 'getUsers error', error });
				return;
			}

			let userDict = {};

			usersResult.forEach((row) => {
				userDict[row.id] = row.name;
			});

			return userDict;
		});
	});
}

function contractsAddDetails(missing, userDict) {
	missing.forEach(row => {
		let contract = gContracts[row.contractId];

		contract.dateIssuedStr = datetimeFormat(contract.origin.dateIssued);
		contract.issuer = userDict[contract.origin.issuerId];

		if (contract.origin.availability == 'personal' && contract.origin.forCorporation == false) {
			contract.assignee = userDict[contract.origin.acceptorId];
		}
		if (!contract.assignee) {
			contract.assignee = userDict[contract.origin.assigneeId];
		}
	});
}

async function getContractShips(contractIds) {
//	cacheContracts.getContracts(corporationId, contractIds, (error, contractShips) => {
//		if (error) {
//			console.log('getContractShips error');
//			params.error = error;
//			_continue();
//			return;
//		}
//
//		let contractShipsMap = {};
//		contractShips.forEach(elem => {
//			contractShipsMap[elem.id] = elem.ships;
//		});
//		//result [{ id: contract_id, ships }]
//
//		data.forEach(row => {
//			let ships = contractShipsMap[row.contractId];
//			if (ships)
//				row.ships = ships.join(' ');
//		});
//
//		contractIds = null;
//		_continue();
//	});
}


//function saveError(msg, other) {
//	log.warn(error, other);
//	// if(count < limit) globalError add ([date, msg]);
//	//genPage({ error });
//}

function createLogger() {
	return {
		info: (msg) => { log.info(msg); logRing.add("[info] " + msg); },
		error: (msg) => { log.error(msg); logRing.add("[error] " + msg); },
		debug: (msg) => { log.debug(msg); logRing.add("[debug] " + msg); }
	};
}

function createLogRing() {
	return {
		add: (elem) => {
			if (_logRing.length >= 20)
				_logRing.shift();
			_logRing.push([new Date(), elem]);
		},
		values: () => _logRing
	}
}