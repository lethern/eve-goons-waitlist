const setup = require('../setup.js');
const user = require('../models/user.js')(setup);
const users = require('../models/users.js')(setup);
const log = require('../logger.js')(module);
const ESI2 = require('eve_swagger_interface');
const cache = require('../cache.js')(setup);
const cacheContracts = require('../cacheContracts.js')(setup);
const contractCheck_new = require('./contractCheck_new.js');



exports.check1 = function (req, res) {
	renderContracts(req, res, 1);
};

function dateFormat(date) {
	if (isNaN(date)) return undefined;
	var mm = date.getMonth() + 1; // getMonth() is zero-based
	var dd = date.getDate();

	return (dd > 9 ? '' : '0') + dd + '.' +
		(mm > 9 ? '' : '0') + mm + '.' +
		date.getFullYear();
}

function parseDate(dateStr) {
	if (!dateStr) return undefined;
	var parts = dateStr.split(".");
	if (parts.length != 3) return undefined;
	return new Date(parseInt(parts[2], 10),
		parseInt(parts[1], 10) - 1,
		parseInt(parts[0], 10));
}

function renderContracts(req, res, mode) {
	if (!(req.isAuthenticated() && users.isRoleNumeric(req.user, 3))) {
		res.status(401).redirect("/");
		return;
	}

	//contractCheck_new
	let userProfile = req.user;
	let sideBarSelected = 5;

//	let date_from = parseDate(req.body.date_from);
//	let date_to = parseDate(req.body.date_to);
//
//	if (isNaN(date_from)) date_from = undefined;
//	if (isNaN(date_to)) date_to = undefined;
//
//	let date_to_filter = date_to;
//
//	if (!isNaN(date_from)) date_from.setHours(12);
//	if (!isNaN(date_to_filter)) date_to_filter.setHours(12);

	/*
	data = data.sort((a, b) => b.dateIssued - a.dateIssued);//.slice(0, 1000);
	data = data.filter(row => {
		let ok = true;
		if (!isNaN(date_from) && row.dateIssued < date_from) ok = false;
		if (!isNaN(date_to_filter) && row.dateIssued > date_to_filter) ok = false;
		return ok;
	});

	if (mode == 1) 
	*/
	{
		//console.log('render ', data.length, (params.error ? ' error ' + params.error : ''));

		let user = req.user.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
		res.render('contractCheck_new.njk', {
			user,
			userProfile, sideBarSelected
			//, data, date_from, date_to
		});
	}
	/*
	} else if (mode == 2) {
		renderContracts_continue2(res, userProfile, sideBarSelected, params.error, data, other, dateFormat(date_from), dateFormat(date_to));
	} else if (mode == 3) {
		renderContracts_continue3(res, userProfile, sideBarSelected, params.error, data, other, dateFormat(date_from), dateFormat(date_to));
	}
	 */
}