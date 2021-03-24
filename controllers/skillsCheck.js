const setup = require('../setup.js');
const user = require('../models/user.js')(setup);
const users = require('../models/users.js')(setup);
const log = require('../logger.js')(module);

const fits_db = require('../dbHandler.js').db.collection('fits');

//*
const ESI2 = require('eve_swagger_interface');
const UniverseApi = new ESI2.UniverseApi();
//*/

exports.index = function (req, res) {
	if (!(req.isAuthenticated())) {
		res.status(401).redirect("/");
		return;
	}

	let renderData = {};
	renderData.userProfile = req.user;
	renderData.sideBarSelected = 2;
	renderData.data = [];

	fits_db.find({}).toArray(function (error, docs) {
		if (error) {
			log.error("skillsCheck fits_db.find error:", { error });
			res.render('skillsCheck.njk', { ...renderData, error });
			return;
		}


		

		let data = docs.map(d => {
			let skillsCache = {};
			let arrays = d.modules.map(m => m.skills);

			let allSkills = [].concat.apply([], arrays);
			allSkills.forEach(s => {
				let id = s.id;
				let level = s.level;
				if (!skillsCache[id]) {
					skillsCache[id] = s;
					return;
				}

				if (skillsCache[id].level < level)
					skillsCache[id].level = level;
			});

			//////
			function getRandomInt(max) {
				return Math.floor(Math.random() * Math.floor(max));
			}
			////////
			let skills = [];
			for (let id in skillsCache) {
				let skill = skillsCache[id];
				skills.push({ name: skill.name, level: skill.level, userLevel: getRandomInt(4)+1 });
			}
			return { name: d.name, skills };
		});
		

		res.render('skillsCheck.njk', { ...renderData, data });
	});


	
};
