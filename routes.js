const express = require('express');
const router = express.Router();
const commander_controller = require('./controllers/commanderController.js');
const admin_bans_controller = require('./controllers/adminBansController.js');
const admin_fcs_controller = require('./controllers/adminCommandersController.js');
const admin_whitelist_controller = require('./controllers/adminWhitelistController.js');
const api_controller = require('./controllers/apiController.js');
const pilot_settings_controller = require('./controllers/pilotSettingsController.js');
const fc_tools_controller = require('./controllers/fcToolsController.js');
const statsController = require('./controllers/statisticsController.js');
const waitlistController = require('./controllers/waitlistController.js');
const fleetsController = require('./controllers/fleetController.js');
//
const contractCheck = require('./controllers/contractCheck.js');
const fitsManager = require('./controllers/fitsManager.js');
const skillsCheck = require('./controllers/skillsCheck.js');
const newFleetManager = require('./controllers/newFleetManager.js');

let disabled = function (req, res) {
	res.render('disabled.njk', { userProfile: req.user, sideBarSelected: 0 });
}

//Public Pages
router.get('/', waitlistController.index);
router.get('/logout', function(req, res){
	req.logout();
	res.status(401).redirect(`/`);
});

router.get('/squad-statistics', disabled);// statsController.index);

//Waitlist Routes
router.post('/join/:type', disabled);//waitlistController.signup);
router.delete('/remove/:type/:characterID', disabled);//waitlistController.selfRemove)


//Pilot Settings
router.get('/my-settings', pilot_settings_controller.index);
router.post('/my-settings/jabber', disabled);//pilot_settings_controller.jabber);

//Commander - Fleets
router.get('/commander', commander_controller.index);
router.post('/commander', commander_controller.registerFleet);
router.delete('/commander/:fleetID', disabled);//fleetsController.delete);

//Commander - FC Waitlist Management
router.get('/commander/:fleetID/', fleetsController.index);
router.post('/commander/:fleetid/update/info', disabled);//fleetsController.getInfo);	
router.post('/commander/admin/alarm/:characterID/:fleetID', disabled);//waitlistController.alarm);//501
router.post('/commander/admin/invite/:characterID/:fleetID', disabled);//fleetsController.invite);
router.post('/commander/admin/remove/:characterID', disabled);//waitlistController.removePilot);

//Commander - Fleet Updates
router.post('/commander/:fleetID/update/backseat', disabled);//fleetsController.updateBackseat);
router.post('/commander/:fleetID/update/commander', disabled);//fleetsController.updateCommander);
router.post('/commander/:fleetID/update/comms', disabled);//fleetsController.updateComms);
router.post('/commander/:fleetID/update/type', disabled);//fleetsController.updateType);
router.post('/commander/:fleetID/update/status', disabled);//fleetsController.updateStatus);
	

//Commander - FC Tools
router.get('/commander/tools/fits-scan', disabled);//fc_tools_controller.fitTool);
router.get('/commander/tools/waitlist-logs', disabled);//fc_tools_controller.waitlistLog);
router.get('/commander/:pilotname/skills', disabled);//fc_tools_controller.skillsChecker);
//Commander - Search for pilot
router.get('/commander/:pilotname/profile', disabled);//fc_tools_controller.pilotSearch);//View
router.post('/search', fc_tools_controller.searchForPilot);//ajax search

router.post('/internal-api/:pilot/logout', fc_tools_controller.logUserOut);
router.post('/internal-api/:pilot/role/:title', fc_tools_controller.setTitle);
	
router.post('/commander/:pilotID/comment', disabled);//fc_tools_controller.addComment);//Add a comment

//Admin - Bans Management
router.get('/admin/bans', admin_bans_controller.index);
router.post('/admin/bans', admin_bans_controller.createBan);
router.get('/admin/bans/:banID', admin_bans_controller.revokeBan);
//Admin - FC Management
router.get('/admin/commanders', admin_fcs_controller.index);
router.post('/admin/commanders/update', admin_fcs_controller.updateUser);

//Admin - Whitelist Management
router.get('/admin/whitelist', admin_whitelist_controller.index);
router.post('/admin/whitelist', admin_whitelist_controller.store);
router.get('/admin/whitelist/:whitelistID', admin_whitelist_controller.revoke);
	
	
//Interacts with the users client via ESI.
router.post('/esi/ui/waypoint/:systemID', disabled);//api_controller.waypoint);
router.post('/esi/ui/info/:targetID', disabled);//api_controller.showInfo);
router.post('/esi/ui/market/:targetID', disabled);//api_controller.openMarket);

//App API endpoints
router.post('/internal-api/fleetcomp/:fleetid/:filter', disabled);//api_controller.fleetAtAGlance);
router.post('/internal-api/waitlist/remove-all', disabled);//waitlistController.clearWaitlist);
router.post('/internal-api/banner', disabled);//api_controller.addBanner);
router.post('/internal-api/banner/:_id', disabled);//api_controller.removeBanner);
router.post('/internal-api/account/navbar', disabled);//api_controller.navbar);
	
//External - APIs
router.get('/api/sstats/members', disabled);//statsController.getMemberList);
router.get('/api/sstats/corporations', disabled);//statsController.getCorporationList);
router.get('/api/sstats/member-registration', disabled);//statsController.getMontlySignups);//Todo make object array with monthName and count.

router.get('/test/contract-check', disabled);//contractCheck.testList);
router.get('/test/contract-check2', disabled);//contractCheck.testList2);
router.get('/test/contract-check3', disabled);//contractCheck.testList3);

router.post('/test/contract-check', disabled);//contractCheck.testList);
router.post('/test/contract-check2', disabled);//contractCheck.testList2);
router.post('/test/contract-check3', disabled);//contractCheck.testList3);

router.get('/test/fits-manager', disabled);//fitsManager.test);
router.post('/test/fits-manager', disabled);//fitsManager.send);

router.get('/test/skills-check', disabled);//skillsCheck.index);

// new fleet list
router.get('/manage_fleet/:fleetID/', newFleetManager.index);

module.exports = router;