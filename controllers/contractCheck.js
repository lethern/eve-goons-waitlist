const setup = require('../setup.js');
const user = require('../models/user.js')(setup);
const users = require('../models/users.js')(setup);
const log = require('../logger.js')(module);
const ESI2 = require('eve_swagger_interface');
const cache = require('../cache.js')(setup);


const ESI2_defaultClient = ESI2.ApiClient.instance;
const ContractsApi = new ESI2.ContractsApi();

exports.testList = function (req, res) {
	if (req.isAuthenticated() && users.isRoleNumeric(req.user, 3)) {

		var userProfile = req.user;
		var sideBarSelected = 5;
		//let characterID = 2116579054; for Nota
		//var corporationId = 98636728;
		let characterID = 2112992068; // Jagger01
		let corporationId = 98119924;

		user.getRefreshToken(characterID, function (accessToken) {
			if (!accessToken) {
				let error = "contractCheck.testList: Could not get an accessToken"
				log.warn(error)
				genPage({ error });
				return;
			}

			// Configure OAuth2 access token for authorization: evesso
			var evesso = ESI2_defaultClient.authentications['evesso'];
			evesso.accessToken = accessToken;

			let page = 1;

			var opts = {
				'page': page,
			};

			var callback = function (error, resData, response) {
				if (error) {
					//console.log('error', error);

					console.log("Error", error.name, error.stack);

					genPage({ error });
				} else {
					let other = {};
					if (response.header) {
						other.date = response.header.date;
						other.expires = response.header.expires;
						other.lastmodified = response.header['last-modified'];
					}
					genPage({ resData, ...other });
				}
			};

			log.info('testList 1 getCorporations');
			ContractsApi.getCorporationsCorporationIdContracts(corporationId, opts, callback);
		})

		function genPage(params) {
			let data = null;
			let other = {};

			if (params.resData) {

				log.info('testList 2 genPage');

				other.refreshMS = new Date(params.expires) - new Date(params.date);

				let extraData = {};
				let outgoing = 0;

				let userIDs = [];

				data = params.resData;
				data.forEach(row => {
					if (row.issuerId) {
						if (!userIDs.includes(row.issuerId)) userIDs.push(row.issuerId);
					}
					if (row.assigneeId) {
						if (!userIDs.includes(row.assigneeId)) userIDs.push(row.assigneeId);
					}
				});

				log.info('testList 3 get ' + userIDs.length);

				let userDict = {};
				cache.massGet(userIDs, (usersResult) => {
					usersResult.forEach((row) => {
						userDict[row.id] = row.name;
					});

					log.info('testList 4 got ' + usersResult.length);

					data.forEach(row => {
						let date = new Date(row.dateIssued);
						let locale = 'en-GB';
						row.dateIssued = date.toLocaleDateString(locale) + ' ' + date.toLocaleTimeString(locale);

						row.issuer = userDict[row.issuerId];
						row.assignee = userDict[row.assigneeId];
						// issuer
						//if (!extraData[row.issuerId]) {
						//	users.findAndReturnUser(row.issuerId, function (response) {
						//		receivedExtraData(row.issuerId, response);
						//	});
						//	outgoing++;
						//	extraData[row.issuerId] = { rows: [row] };
						//} else {
						//	extraData[row.issuerId].rows.push(row);
						//}
						//return row;
					});

					_continue();
				});

				
				//userIDs.forEach(id => {
				//	users.findAndReturnUser(row.issuerId, function (response) {
				//		receivedExtraData(row.issuerId, response);
				//	});
				//});


				/*
				function receivedExtraData(id, user) {
					let text;
					if (!user) {
						//extraData[id].row.issuer = ;
						text = id;
					} else {
						text = user.name;
					}

					extraData[id].rows.forEach(row => { row.issuer = text });

					--outgoing;
					if (outgoing == 0) {
						_continue();
					}
				}
				*/

				
			}

			function _continue() {
				log.info('testList 5 _continue ' + data.length);
				res.render('contractCheck.njk', { userProfile, sideBarSelected, error: params.error, data, other });
			}
		};


		/*
		var api = new ESI.AllianceApi()

		var callback = function (error, data, response) {
			if (error) {
				console.error(error);
				res.render('contractCheck.njk', { userProfile, sideBarSelected, error });
			} else {
				console.log('API called successfully. Returned data: ' + data);
				res.render('contractCheck.njk', { userProfile, sideBarSelected, data });
			}
		};
		api.getAlliances(opts, callback);
*/

	} else {
		res.status(401).redirect("/");
	}
}
