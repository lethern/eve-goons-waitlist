const setup = require('../setup.js');
const user = require('../models/user.js')(setup);
const users = require('../models/users.js')(setup);
const log = require('../logger.js')(module);

const fits_db = require('../dbHandler.js').db.collection('fits');

//*
const ESI2 = require('eve_swagger_interface');
const UniverseApi = new ESI2.UniverseApi();
//*/

exports.test = function (req, res) {
	if(!(req.isAuthenticated() && users.isRoleNumeric(req.user, 3))) {
		res.status(401).redirect("/");
		return;
	}

	let userProfile = req.user;
	let sideBarSelected = 5;
	let error = null;
	let data = [];
	res.render('fitsManager.njk', { userProfile, sideBarSelected, error, data });
};


function onlyUnique(value, index, self) {
	return !!value && self.indexOf(value) === index;
}

exports.send = function (req, res) {
	if (!(req.isAuthenticated() && users.isRoleNumeric(req.user, 3))) {
		res.status(401).redirect("/");
		return;
	}

	let renderData = {};
	renderData.userProfile = req.user;
	renderData.sideBarSelected = 5;
	renderData.data = [];

	renderData.fitString = req.body.fit;

	let fit_arr = req.body.fit.split('\n');
	renderData.header = req.body.name;
	let ship = fit_arr.shift();

	// '[Basilisk, Simulated Basilisk Fitting]'

	ship = ship.substr(ship.indexOf('[') + 1, ship.indexOf(',') - 1)

	if (!ship || !ship.length) {
		res.render('fitsManager.njk', { ...renderData, error: "Wrong first line (ship name)" });
		return;
	}

	fit_arr.unshift(ship);

	fit_arr = fit_arr.map(a => {
			a = a.replace(/^\s+/, '').replace(/\s+$/, '');

			const regex = / x\d+$/g;
			const found = a.match(regex);
			if (found) {
				a = a.replace(regex, '');
			}
			
			return a;
	}).filter(onlyUnique);

	if (fit_arr.length < 1 || fit_arr.length > 50) {
		res.render('fitsManager.njk', { ...renderData, error: "Wrong input" });
		return;
	}

	if (!req.body.name || req.body.name.length < 1) {
		res.render('fitsManager.njk', { ...renderData, error: "Wrong name" });
		return;
	}

	parseFitNames(fit_arr, renderData, res);
}

function parseFitNames(fit_arr, renderData, res) {
	var callback = function (error, data, response) {
		if (error) {
			res.render('fitsManager.njk', { ...renderData, error });
			return;
		}

		let result = data.inventoryTypes;
		getDogma(result, renderData, res);
		
	};
	UniverseApi.postUniverseIds(fit_arr, {}, callback);
};

function getDogma(inventoryTypes, renderData, res) {
	let itemsInfo = [];
	renderData.itemsInfo = itemsInfo;

	let index = 0;

	getDogmaStep();


	function getDogmaStep(error, data) {
		if (error) {
			res.render('fitsManager.njk', { ...renderData, error });
			return;
		}

		if (data) {
			//let typeId = inventoryTypes[index].id;
			//itemsInfo[typeId] = data;
			itemsInfo.push(data);
			++index;
		}

		if (index >= inventoryTypes.length) {
			getDogmaFinished();
			return;
		}

		let typeId = inventoryTypes[index].id;
		UniverseApi.getUniverseTypesTypeId(typeId, {}, getDogmaStep);
	};

	function getDogmaFinished() {
		for (let item of itemsInfo) {
			let attributes = item.dogmaAttributes;
			let skills = [];
			item.skills = skills;

			for (let attr of attributes) {
				let id = attr.attributeId;
				let val = attr.value;

				let indx = [182, 183, 184, 1285, 1289, 1290].indexOf(id);
				if(indx >= 0) {
					if (!skills[indx]) skills[indx] = {};
					skills[indx].id = val;
				}

				indx = [277, 278, 279, 1286, 1287, 1288].indexOf(id);
				if (indx >= 0) {
					if (!skills[indx]) skills[indx] = {};
					skills[indx].level = val;
				}
			}
			let x = 0;
		}

		let arrays = itemsInfo.map(i => i.skills);
		let allSkills = [].concat.apply([], arrays);
		allSkills = allSkills.map(s => s.id);
		allSkills = allSkills.filter(onlyUnique);

		getSkillNames(allSkills, renderData, res);
	};
	
	
};

function getSkillNames(allSkills, renderData, res) {
	
	var callback = function (error, data, response) {
		if (error) {
			res.render('fitsManager.njk', { ...renderData, error });
			return;
		}

		let skillsMapping = {};
		data.forEach(row => {
			if (row.category != 'inventory_type') return;
			skillsMapping[row.id] = row.name;
		})

		let result = renderData.itemsInfo.map(i => {
			let skills = i.skills.map(skill => ({ id: skill.id, name: skillsMapping[skill.id], level: skill.level }));
			return { name: i.name, type_id: i.typeId, iconId: i.iconId, skills };
		});

		let fit = {
			name: renderData.header,
			fitString: renderData.fitString,
			modules: result
		};

		renderData.data = result.map(r => ({
			name: r.name,
			skills: r.skills.map(s => s.name+' '+s.level).join(',\n')
		}));

		saveFit(fit, renderData, res);
	};

	UniverseApi.postUniverseNames(allSkills, {}, callback);

};

function saveFit(fit, renderData, res) {

	fits_db.insert(fit, function (error, result) {
		if (error) {
			log.error("fitsManager  saveFit: Error for db.insert", { err });
			res.render('fitsManager.njk', { ...renderData, error });
			return;
		}

		res.render('fitsManager.njk', { ...renderData, data: renderData.data });
	});

};