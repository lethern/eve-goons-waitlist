const setup = require('../setup.js');
const user = require('../models/user.js')(setup);
const users = require('../models/users.js')(setup);
const log = require('../logger.js')(module);
const ESI2 = require('eve_swagger_interface');
const cache = require('../cache.js')(setup);
const cacheContracts = require('../cacheContracts.js')(setup);


const ESI2_defaultClient = ESI2.ApiClient.instance;
const ContractsApi = new ESI2.ContractsApi();
const UniverseApi = new ESI2.UniverseApi();


function dateFormat(date) {
	if (isNaN(date)) return undefined;
	var mm = date.getMonth() + 1; // getMonth() is zero-based
	var dd = date.getDate();

	return (dd > 9 ? '' : '0') + dd + '.' +
		(mm > 9 ? '' : '0') + mm + '.' +
		date.getFullYear();
}

function datetimeFormat (date) {
	var mm = date.getMonth() + 1; // getMonth() is zero-based
	var dd = date.getDate();
	var hh = date.getHours();
	var min = date.getMinutes();

	return (dd > 9 ? '' : '0') + dd + '.' +
		(mm > 9 ? '' : '0') + mm + '.' +
		date.getFullYear() + '  ' +
		(hh > 9 ? '' : '0') + hh + ':' +
		(min > 9 ? '' : '0') + min;
};

function parseDate(dateStr) {
	if (!dateStr) return undefined;
	var parts = dateStr.split(".");
	if (parts.length != 3) return undefined;
	return new Date(parseInt(parts[2], 10),
		parseInt(parts[1], 10) - 1,
		parseInt(parts[0], 10));
}



exports.testList_x = function (req, res) {
	if (!(req.isAuthenticated() && users.isRoleNumeric(req.user, 3))) {
		res.status(401).redirect("/");
		return;
	}

	let userProfile = req.user;
	let sideBarSelected = 5;
	//let characterID = 2116579054; for Nota
	//var corporationId = 98636728;
	let characterID = 2112992068; // Jagger01
	let corporationId = 98119924; // dgiad

	user.getRefreshToken(characterID, function (accessToken) {
		if (!accessToken) {
			let error = "contractCheck.testList: Could not get an accessToken"
			log.warn(error)
			//genPage({ error });
			return;
		}

		var evesso = ESI2_defaultClient.authentications['evesso'];
		evesso.accessToken = accessToken;

		/*
		var contractId = 168246256; // Number | ID of a contract

		var corporationId = 98119924; // Number | An EVE corporation ID
		let opts = {};

		var callback = function (error, data, response) {
			if (error) {
				console.error(error);
			} else {
				console.log('API called successfully. Returned data: ' + JSON.stringify(data));
			}
		};
		ContractsApi.getCorporationsCorporationIdContractsContractIdItems(contractId, corporationId, opts, callback);
		*/





		/*
		var ids = [17715];

		var opts = {
		};

		var callback = function (error, data, response) {
			if (error) {
				console.error(error);
			} else {
				console.log('API called successfully. Returned data: ' + JSON.stringify(data));
			}
		};
		UniverseApi.postUniverseNames(ids, opts, callback);

		// API called successfully. Returned data: [{"category":"inventory_type","id":17715,"name":"Gila"}]
		*/


		/*
		const typeId = 17715;
		
		var opts = {
			'page': 1,
		};

		var callback = function (error, data, response) {
			if (error) {
				console.error(error);
			} else {

				"groupId":,
				"name":"Gila",
				"graphicId":1824,
				"marketGroupId":1371,
				"mass":9600000,
				"packagedVolume":10000,
				"portionSize":1,
				"radius":166,
				"volume":101000}

				//group_id
				//name
				console.log('API called successfully. Returned data: ' + JSON.stringify(data));
			}
		};
		UniverseApi.getUniverseTypesTypeId(typeId, opts, callback);
		*/

		const groupId = 26;
		var opts = {
		};

		var callback = function (error, data, response) {
			if (error) {
				console.error(error);
			} else {
				/*
				 "categoryId":6,
				"groupId":26,
				"name":"Cruiser",
				"types":[620,621,622,623,624,625,626,627,628,629,630,631,632,633,634,635,1904,2006,11011,17634,17709,17713,17715,17718,17720,17722,17843,17922,25560,29336,29337,29340,29344,33470,33553,33639,33641,33643,33645,33647,33649,33651,33653,33818,34445,34475,34590,47270,49712,52267,54732]}

				 */
				console.log('API called successfully. Returned data: ' + JSON.stringify(data));
			}
		};
		UniverseApi.getUniverseGroupsGroupId(groupId, opts, callback);

	}, res);
};

exports.testList = function (req, res) {
	renderContracts(req, res, 1);
};

exports.testList2 = function (req, res) {
	renderContracts(req, res, 2);
};

exports.testList3 = function (req, res) {
	renderContracts(req, res, 3);
};

function renderContracts(req, res, mode) {
	if (!(req.isAuthenticated() && users.isRoleNumeric(req.user, 3))) {
		res.status(401).redirect("/");
		return;
	}

	let userProfile = req.user;
	let sideBarSelected = 5;
	let characterID = 2112992068; // Jagger01
	let corporationId = 98119924; // dgiad

	let date_from = parseDate(req.body.date_from);
	let date_to = parseDate(req.body.date_to);
	
	if (isNaN(date_from)) date_from = undefined;
	if (isNaN(date_to)) date_to = undefined;

	let date_to_filter = date_to;
	//if (!isNaN(date_to_filter)) date_to_filter.setDate(date_to_filter.getDate() + 1);

	if (!isNaN(date_from)) date_from.setHours(12);
	if (!isNaN(date_to_filter)) date_to_filter.setHours(12);

	console.log('filter from ' + date_from + ' to ' + date_to_filter)
	user.getRefreshToken(characterID, function (accessToken) {
		if (!accessToken) {
			let error = "contractCheck.testList: Could not get an accessToken"
			log.warn(error)
			genPage({ error });
			return;
		}

		var evesso = ESI2_defaultClient.authentications['evesso'];
		evesso.accessToken = accessToken;

		let page = 1;

		var opts = {
			'page': page,
		};

		let resData_sum;

		function callback (error, resData, response) {
			if (error) {
				console.log("Error", error.name, error.stack);
				genPage({ error });
			} else {
				let other = {};
				other.date = response.header.date;
				other.expires = response.header.expires;
				other.lastmodified = response.header['last-modified'];
				let pages = +response.header['x-pages'];

				if (!resData_sum) resData_sum = resData;
				else resData_sum = resData_sum.concat(resData);

				if (page < pages) {
					page++;
					opts.page = page;

					console.log('page ' + page + '/' + pages);
					ContractsApi.getCorporationsCorporationIdContracts(corporationId, opts, callback);
				} else {
					genPage({ resData: resData_sum, ...other });
				}
			}
		};

		ContractsApi.getCorporationsCorporationIdContracts(corporationId, opts, callback);
	}, res)

	function genPage(params) {
		let data = null;
		let other = {};

		if (params.resData) {
			data = params.resData.map(row => {
				return {
					origin: row,
					dateIssued: row.dateIssued,

					contractId: row.contractId,
					dateIssuedStr: '',
					issuer: '',
					assignee: '',
					ships: '',
					price: row.price,
					status: row.status,
					type: row.type,
				}
			});

			other.refreshMS = new Date(params.expires) - new Date(params.date);

			let userIDs = [];
			let contractIds = [];

			data = data.sort((a, b) => b.dateIssued - a.dateIssued);//.slice(0, 1000);
			data = data.filter(row => {
				let ok = true;
				if (!isNaN(date_from) && row.dateIssued < date_from) ok = false;
				if (!isNaN(date_to_filter) && row.dateIssued > date_to_filter) ok = false;
				return ok;
			});
      
      
      /*
      let r1 = new Date('2021.06.19 06:59');
      let r2 = new Date('2021.06.19 07:01');
      data.forEach( (a)=>{
        if( r1 < a.dateIssued && a.dateIssued < r2){
          console.log(a);
        }
      })
*/
			data.forEach(row => {
				if (row.origin.issuerId) {
					if (!userIDs.includes(row.origin.issuerId)) userIDs.push(row.origin.issuerId);
				}
        
        if(row.origin.availability == 'personal' && row.origin.forCorporation== false){
          if (row.origin.acceptorId) {
            if (!userIDs.includes(row.origin.acceptorId)) userIDs.push(row.origin.acceptorId);
          }
        }

        if (row.origin.assigneeId) {
          if (!userIDs.includes(row.origin.assigneeId)) userIDs.push(row.origin.assigneeId);
        }


				if (!['cancelled', 'rejected', 'failed', 'deleted', 'reversed'].includes(row.origin.status)) {
					// "outstanding", "in_progress", "finished_issuer", "finished_contractor", "finished"
					contractIds.push(row.contractId);
				}
			});


			getUsers();

			function getUsers() {
				cache.massGet(userIDs, (error, usersResult) => {
					if (error) {
						params.error = error;
						_continue();
						return;
					}

					userIDs = null;

					let userDict = {};

					usersResult.forEach((row) => {
						userDict[row.id] = row.name;
					});

					data.forEach(row => {
						row.dateIssuedStr = datetimeFormat(row.dateIssued);
						row.issuer = userDict[row.origin.issuerId];
            
            if(row.origin.availability == 'personal' && row.origin.forCorporation== false){
              row.assignee = userDict[row.origin.acceptorId];  
            }
            if(!row.assignee){
              row.assignee = userDict[row.origin.assigneeId];
            }
					});

					getContractShips();
				});
			}

			function getContractShips() {
				try {
					cacheContracts.getContracts(corporationId, contractIds, (error, contractShips) => {
						if (error) {
							console.log('getContractShips error');
							params.error = error;
							_continue();
							return;
						}

						let contractShipsMap = {};
						contractShips.forEach(elem => {
							contractShipsMap[elem.id] = elem.ships;
						});
						//result [{ id: contract_id, ships }]

						data.forEach(row => {
							let ships = contractShipsMap[row.contractId];
							if(ships)
								row.ships = ships.join(' ');
						});

						contractIds = null;
						_continue();
					});
				} catch (e) {
					console.log('getContracts exception');
					params.error = e;
					_continue();
				}
			}
		}

		function _continue() {
			let date = new Date(2021, 1, 27);

			if (mode == 1) {
				console.log('render ', data.length, (params.error ? ' error ' + params.error : ''));
				res.render('contractCheck.njk', { userProfile, sideBarSelected, error: params.error, data, other, from: dateFormat(date_from), to: dateFormat(date_to) });
				params = null;
				data = null;
				other = null;
			} else if (mode == 2) {
				renderContracts_continue2(res, userProfile, sideBarSelected, params.error, data, other, dateFormat(date_from), dateFormat(date_to));
			} else if (mode == 3) {
				renderContracts_continue3(res, userProfile, sideBarSelected, params.error, data, other, dateFormat(date_from), dateFormat(date_to));
			}
		}
	};
}

function renderContracts_continue2(res, userProfile, sideBarSelected, error, data, other, from, to) {
	let renderData = [];

	let pilots = {};
	data.forEach(row => {
		if (row.assignee == 'DGIAD') {
			if (!pilots[row.issuer]) pilots[row.issuer] = { returned: [], rented: [] };
			pilots[row.issuer].returned.push(row);
		} else {
			if (!pilots[row.assignee]) pilots[row.assignee] = { returned: [], rented: [] };
			pilots[row.assignee].rented.push(row);
		}
	});

	for (let pilotName in pilots) {
		let returned = flatten(pilots[pilotName].returned.map(elem => elem.ships.split(' ')));
		let returnedCounted = countElems(returned).join('\n');
		let rented = flatten(pilots[pilotName].rented.map(elem => elem.ships.split(' ')));
		let rentedCounted = countElems(rented).join('\n');
		renderData.push({ pilotName, returned: returnedCounted, rented: rentedCounted })
	}

	console.log('render2 ', renderData.length, (error ? ' error ' + error : ''));
	res.render('contractCheck2.njk', { userProfile, sideBarSelected, error, data: renderData, other, from, to });
}

function flatten(arr) {
	return [].concat(...arr);
}

function countElems(arr) {
	let result = [];
	arr.sort();
	var current = null;
	var cnt = 0;
	for (var i = 0; i < arr.length; i++) {
		if (arr[i] != current) {
			if (current && cnt > 0) {
				result.push(current + ' x' + cnt);
			}
			current = arr[i];
			cnt = 1;
		} else {
			cnt++;
		}
	}
	if (cnt > 0) {
		result.push(current + ' x' + cnt);
	}
	return result;
}


function renderContracts_continue3(res, userProfile, sideBarSelected, error, data, other, from, to) {
	let renderData = [];

	let pilots = {};
	
	data.forEach(row => {
		if (row.assignee == 'DGIAD') {
			if (!pilots[row.issuer]) pilots[row.issuer] = { returned: [], rented: [] };
			pilots[row.issuer].returned.push(row);
		} else {
			if (!pilots[row.assignee]) pilots[row.assignee] = { returned: [], rented: [] };
			pilots[row.assignee].rented.push(row);
		}
	});

	for (let pilotName in pilots) {
		let returned = flatten(pilots[pilotName].returned.map(elem => {
			return elem.ships.split(' ').map(ship => ({ returned: 1, rented: 0, ship, date: elem.dateIssued }));
		}));
		let returnedCounted = countElems(returned).join('\n');
		let rented = flatten(pilots[pilotName].rented.map(elem => {
			return elem.ships.split(' ').map(ship => ({ returned: 0, rented: 1, ship, date: elem.dateIssued }));
		}));

		let all = returned.concat(rented).sort((a, b) => a.date - b.date);
		let left = [];
		let right = [];
		let side = 0;
		for (let elem of all) {
			if (!elem.ship) continue;
			if (elem.rented) {
				if (side) right.push('_');
				side = true;
				left.push(elem.ship + ' ' +datetimeFormat(elem.date))
			}
			if (elem.returned) {
				if (!side) left.push('_');
				side = 0;
				right.push(elem.ship + ' ' + datetimeFormat(elem.date))
			}
		}
		if (side) right.push('_');

		//let rentedCounted = countElems(rented).join('\n');
		renderData.push({ pilotName, left: left.reverse().join('\n'), right: right.reverse().join('\n') })
	}

	console.log('render3 ', renderData.length, (error ? ' error ' + error : ''));
	res.render('contractCheck3.njk', { userProfile, sideBarSelected, error, data: renderData, other, from, to });
}