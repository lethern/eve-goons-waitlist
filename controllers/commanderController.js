const setup = require('../setup.js');
const newFleets = require('../models/newFleets.js')(setup);
const users = require('../models/users.js')(setup);
const log = require('../logger.js')(module);

//Render FC Dashboard Page
exports.index = function(req, res) {
    if (users.isRoleNumeric(req.user, 1)) {
		newFleets.getFleetList(function (fleets) {
            //if (!fleets) {
            //    res.status(403).send("No fleets found<br><br><a href='/'>Go back</a>");
            //    return;
            //}

            var userProfile = req.user;
            var sideBarSelected = 5;
            var fleets = fleets;
            res.render('fcFleetList.njk', {userProfile, sideBarSelected, fleets});
        })
    } else {
        req.flash("content", {"class":"error", "title":"Not Authorised!", "message":"Only our FC team has access to that page! Think this is an error? Contact a member of leadership."});
        res.status(403).redirect("/");
    }
}

/*
* Registers a new fleet
* @params req{}
* @return res{}
*/
exports.registerFleet = function(req, res) {
    if(!users.isRoleNumeric(req.user, 1)){
        req.flash("content", {"class":"error", "title":"Not Authorised!", "message":"Only our FC team has access to that page! Think this is an error? Contact a member of leadership."});
        res.status(403).redirect('/commander');       
        return;
    }

    //Obtain the Fleet ID
    try {
        var fleetID = req.body.url.split("fleets/")[1].split("/")[0];
    } catch (error) {
        req.flash("content", {"class":"error", "title":"Error parsing the fleet ID", "message":"Did you copy the fleet URL from the fleet menu?"});
        res.status(400).redirect("/commander");      
        return;  
    }
   
	newFleets.validate(req.user.characterID, fleetID, function(noAccess){
        if(!noAccess){
            req.flash("content", {"class":"error", "title":"We cannot query the fleet.", "message":"This probably means " + req.user.name + " is not the fleet boss."});
            res.status(409).redirect("/commander");
            return;
		}

		let url = req.body.url;
		let fleetType = req.body.fleet;
		let incursionType = req.body.type;
		if (fleetType != 'Incursion') incursionType = undefined;

        var fleetInfo = {
			fc: {
				"characterID": req.user.characterID,
				"name": req.user.name
			},
			fleetType,
			incursionType,
            //type: req.body.type,
            status: "Not Listed",
            location: null,
            //members: {},
			url,
            id: fleetID+'',
            //comms: { 
            //    name: setup.fleet.comms[req.body.comms].name,
            //    url: setup.fleet.comms[req.body.comms].url
            //},
            //errors: 0
			toLoadSquads: false,
			errorsCount: 0,
        }

		newFleets.register(fleetInfo, function (error) {
			if (error) {
				req.flash("content", { "class": "error", "title": "Woops!", "message": "Something went wrong. Are you trying to register the same fleet twice?" });
				res.status(409).redirect('/commander');
				return;
			}

			log.debug("Registered new fleet " + fleetID);

			req.flash("content", { "class": "info", "title": "Fleet Registered", "message": "Fleet ID: " + fleetID });
			//res.status(200).redirect('/commander/'+ fleetID);
			res.status(200).redirect('/manage_fleet/' + fleetID);
		})
    })
}