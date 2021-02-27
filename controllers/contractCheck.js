const setup = require('../setup.js');
const user = require('../models/user.js')(setup);
const users = require('../models/users.js')(setup);
const log = require('../logger.js')(module);
const ESI2 = require('eve_swagger_interface');


const ESI2_defaultClient = ESI2.ApiClient.instance;
const ContractsApi = new ESI2.ContractsApi();

exports.testList = function (req, res) {
	if (req.isAuthenticated() && users.isRoleNumeric(req.user, 3)) {
		var userProfile = req.user;
		var sideBarSelected = 5;

		let characterID = 2116579054;
		/*
		users.findAndReturnUser(characterID, function (profile) {
			users.getAlts(characterID, function (Alts) {
				manageUser = profile;
				manageUser.account.pilots = Alts;
				genPage();
			})
		})
		*/
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

			var corporationId = 109788662;
			let page = 1;

			var opts = {
				'page': page,
			};

			var callback = function (error, data, response) {
				if (error) {
					genPage({ error });
				} else {
					genPage({ data });
				}
			};
			ContractsApi.getCorporationsCorporationIdContracts(corporationId, opts, callback);
		}) 

		function genPage(params) {
			let data = params.data;
			res.render('contractCheck.njk', { userProfile, sideBarSelected, error: params.error, data });
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
