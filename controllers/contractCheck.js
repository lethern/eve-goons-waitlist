const setup = require('../setup.js');
const user = require('../models/user.js')(setup);
const users = require('../models/users.js')(setup);
const log = require('../logger.js')(module);
const ESI2 = require('eve_swagger_interface');


const ESI2_defaultClient = ESI2.ApiClient.instance;
const ContractsApi = new ESI2.ContractsApi();

exports.testList = function (req, res) {
	if (req.isAuthenticated() && users.isRoleNumeric(req.user, 4)) {
		var userProfile = req.user;
		var sideBarSelected = 5;

		user.getRefreshToken(req.user.characterID, function (accessToken) {
			if (!!!accessToken) {
				log.warn("contractCheck.testList: Could not get an accessToken", { pilot: user.name })
				//cb({ id: 0, name: "unknown", lastcheck: Date.now() });
				return;
			}

			// Configure OAuth2 access token for authorization: evesso
			var evesso = ESI2_defaultClient.authentications['evesso'];
			evesso.accessToken = accessToken;



			var corporationId = 109788662; // Number | An EVE corporation ID

			var opts = {
				//'datasource': "tranquility",
				//'ifNoneMatch': "ifNoneMatch_example",
				'page': 1,
				//'token': "token_example" // String | Access token to use if unable to set a header
			};

			var callback = function (error, data, response) {
				if (error) {
					console.error('testList', error);
				} else {
					console.log('testList API called successfully. Returned data: ' + data);
				}
			};
			ContractsApi.getCorporationsCorporationIdContracts(corporationId, opts, callback);

			/*
			esi.characters(user.characterID, accessToken).location().then(function (locationResult) {
				cache.get(locationResult.solar_system_id, null, function (systemObject) {
					var location = {
						systemID: systemObject.id,
						name: systemObject.name,
					}
					cb(location);
				})
			}).catch(function (err) {
				log.error("user.getLocation: Error GET /characters/{character_id}/location/", { pilot: user.name, err });
				cb({ id: 0, name: "unknown", lastcheck: Date.now() });
			})
			*/
		}) 

		/*
		var api = new ESI.AllianceApi()

		var opts = {
			//'datasource': "tranquility", // {String} The server name you would like data from
			//'ifNoneMatch': "ifNoneMatch_example", // {String} ETag from a previous request. A 304 will be returned if this matches the current ETag
		};

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
