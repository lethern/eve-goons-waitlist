const setup = require('../setup.js');
const cache = require('../cache.js')(setup);
const fleets = require('../models/fleets.js')(setup);
const user = require('../models/user.js')(setup);
const users = require('../models/users.js')(setup);
const banner = require('../models/waitlistBanner.js')(setup);
const wlog = require('../models/wlog');
const api = require('./apiController');

exports.waypoint = function(req, res) {
    if (req.isAuthenticated() && typeof req.params.systemID !== "undefined") {
        user.setDestination(req.user, req.params.systemID, function(response) {
            res.send(response);
        });
    } else {
        res.status(400).send("Not authorised or target ID missing");
    }
}

exports.showInfo = function(req, res) {
    if (req.isAuthenticated() && typeof req.params.targetID !== "undefined") {
        user.showInfo(req.user, req.params.targetID, function(response) {
            res.send(response);
        });
    } else {
        res.status(400).send("Not authorised or target ID missing");
    }
}

exports.openMarket = function(req, res) {
    if(req.isAuthenticated() && typeof req.params.targetID !== "undefined") {
        user.openMarketWindow(req.user, req.params.targetID, function(response) {
            res.send(response);
        });
    } else {
        res.status(400).send("Not authorised or target ID missing");
    }
}
//Show the fleet at a glance window.
exports.fleetAtAGlance = function(req, res) {
//    fleets.get(req.params.fleetid, function (fleet) {
//        if (fleet) {
//            var ships = [];
//            
//            var counter = 0;
//            for(var i = 0; i < fleet.members.length; i++) { //where the fuck is shipID coming from? I'm bad
//                cache.get(fleet.members[i].ship_type_id, null, function(ship) {
//                ships.push(ship); //<<<<<
//                counter++;
//                    if(counter === fleet.members.length) {
//                        module.createShipsHTML(ships, req.params.filter, res);
//                    }
//                });
//            }
//        } else {
//            res.status(400).send("No fleet found");
//        }
//    });     
}

//Store a new banner
exports.addBanner = function(req, res){
    if(req.isAuthenticated() && req.user.role.numeric > 0){
        banner.createNew(req.user, req.body.text, req.body.type, function(status){
            res.status(status).send();
        })
    } else {
        res.status(400).send("Not authorised");
    }
}

//Hide last banner
exports.removeBanner = function(req, res){
    if(req.isAuthenticated() && req.user.role.numeric > 0){
        banner.hideLast(function(status){
            res.status(status).send();
        })
    } else {
        res.status(400).send("Not authorised");
    }
}

//Count the total number of each ship and make the table.
module.createShipsHTML = function (ships, filter, res) {
    var fleet = [];

    while(ships.length > 0) {
        var ship = ships.pop();
        
        if(fleet[ship.id]) {
            fleet[ship.id].count += 1;
        } else {
            fleet[ship.id] = {
                id: ship.id,
                name: ship.name,
                count: 1
            }
        }
    }

    //Sort by count then name.
    fleet.sort(function(a,b) { 
        if(a.count < b.count) {
            return 1;
        } else if (a.count > b.count) {
            return -1;
        } else {
            if(a.name > b.name) return 1;
            return -1;
        }
    });
    
    var filterShipIDs = setup.fleetCompFilters[filter];
    
    var count = 1;
    var html = `<table class="table table-striped table-sm">
    <tbody>`;
    for (ship in fleet) {
        if(filterShipIDs === undefined || filterShipIDs !== undefined && filterShipIDs.includes(fleet[ship].id)) {
            html += `<td class="tw35"><img src="https://image.eveonline.com/Render/${fleet[ship].id}_32.png" alt="Ship Icon"></td>
            <td class="tw20per"><a href="#">${fleet[ship].name}</a></td>
            <td>${fleet[ship].count}</td>`

            if (count % 3 === 0) {
                html += `</tr>
                <tr>`
            }
            count++;
        }
    }

    html += `</tbody>
    </table>`;
    
    res.status(200).send(html);
}

/*
* Invert the nav bar state
* @params req{}
* @return res{status}
*/
exports.navbar = function(req, res){
    if(!users.isRoleNumeric(req.user, 0)){
        res.status(401).send("Authentication Required");
        return;
    }
    
    user.sideNav(req.user, function(cb){
        res.status(cb).send();
    })
}