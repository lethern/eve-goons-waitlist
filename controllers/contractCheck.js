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



exports.testList2 = function (req, res) {
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

	});
};

exports.testList = function (req, res) {
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
	})

	function genPage(params) {
		let data = null;
		let other = {};

		if (params.resData) {
			data = params.resData;

			console.log('genPage', data.length);

			other.refreshMS = new Date(params.expires) - new Date(params.date);

			let userIDs = [];
			let contractIds = [];

			//data.forEach(row => {
			//	row.dateIssued = new Date(row.dateIssued);
			//});
			//if (data.length) console.log('last ', data[data.length - 1].dateIssued);
			data = data.sort((a, b) => b.dateIssued - a.dateIssued).slice(0, 500);
			//data = data.reverse().slice(0, 100);

			
			data.forEach(row => {
				if (row.issuerId) {
					if (!userIDs.includes(row.issuerId)) userIDs.push(row.issuerId);
				}
				if (row.assigneeId) {
					if (!userIDs.includes(row.assigneeId)) userIDs.push(row.assigneeId);
				}

				contractIds.push(row.contractId);
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

					//data = data.map(row => {
					data = data.forEach(row => {
						row.dateIssuedStr = datetimeFormat(row.dateIssued);
						row.issuer = userDict[row.issuerId];
						row.assignee = userDict[row.assigneeId];

						//let dateIssuedStr = datetimeFormat(row.dateIssued);
						//let issuer = userDict[row.issuerId];
						//let assignee = userDict[row.assigneeId];
						//return { ...row, dateIssuedStr, issuer, assignee };
					});

					getContracts();
				});
			}

			function getContracts() {
				console.log('calling getContracts');
				cacheContracts.getContracts(corporationId, contractIds, (error, result) => {
					if (error) {
						params.error = error;
						_continue();
						return;
					}
					//contractIds

					contractIds = null;
					getItems();
				});
			}

			function getItems() {
				console.log('calling getItems');
				_continue();
			};

		}

		function _continue() {
			res.render('contractCheck.njk', { userProfile, sideBarSelected, error: params.error, data, other });
			params = null;
			data = null;
			other = null;
		}
	};
}
