const setup = require('../setup.js');
const users = require('../models/users.js')(setup);
const log = require('../logger.js')(module);



exports.index = function (req, res) {
	if (!users.isRoleNumeric(req.user, 1)) {
		req.flash("content", { "class": "error", "title": "Not Authorised!", "message": "Only FC has access to that page" });
		res.status(403).redirect('/commander');
		return;
	}

	let pageData = {};
	pageData.userProfile = req.user;
	pageData.sideBarSelected = 5;
	let user = req.user.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

	renderPage();

	function renderPage() {
		res.render('fcFleetNew.njk', {
			//pilots: JSON.stringify(pilots),
			fleetId: req.params.fleetID,
			userProfile: pageData.userProfile,
			sideBarSelected: pageData.sideBarSelected,
			user,
		}); // fleet, usersOnWaitlist, comms
	}
}

