{
	function generateTestModel() {
		return [{
			name: 'lethern Zell',
			main: null,
			squad: 'Squad 1',
			shipsSub: ['basi', 'huginn', 'gila'],
			shipsAll: ['gnosis', 'praxi'],
			timeActive: '500',
			timeWaitlist: '0',
			timeTotal: '500',
			ship: 'Basilisk',
			system: 'Jita',
		},{
			name: 'saelen saal',
			main: 'lethern Zell',
			squad: 'Squad 2',
			shipsSub: ['gila'],
			shipsAll: ['gnosis', 'praxi'],
			timeActive: '234',
			timeWaitlist: '234',
			timeTotal: '234',
			ship: 'Capsule',
			system: 'Hek',
		},{
			name: 'Johny Bravo',
			main: null,
			squad: 'Waitlist',
			shipsSub: ['gila'],
			shipsAll: [],
			timeActive: '0',
			timeWaitlist: '30',
			timeTotal: '30',
			ship: 'Gila',
			system: 'Jita',
		},{
			name: 'Bob bobman',
			main: null,
			squad: 'Alts',
			shipsSub: ['gila', 'praxi'],
			shipsAll: [],
			timeActive: '70',
			timeWaitlist: '100',
			timeTotal: '170',
			ship: 'Gila',
			system: 'Jita',
		},{
			name: 'Alice bobman',
			main: 'Bob bobman',
			squad: 'AFK',
			shipsSub: ['gila', 'praxi'],
			shipsAll: [],
			timeActive: '0',
			timeWaitlist: '100',
			timeTotal: '100',
			ship: 'Capsule',
			system: 'Jita',
		},{
			name: 'Denise bobman',
			main: 'Bob bobman',
			squad: 'Waitlist',
			shipsSub: ['praxi'],
			shipsAll: [],
			timeActive: '0',
			timeWaitlist: '100',
			timeTotal: '100',
			ship: 'Gila',
			system: 'Jita',
		}];
	};
}

const IS_TEST = 0;

/*
// todo:
// * when error occurs and someone clicks the "Retry", the connection
//  resumes, but the error hides only for the person who clicked, not the rest
// * need to support errors better - right now just the "move player" - might result in an error, so we should add
//  a timer to un-stuck it, so FC can click it again (the "moving...")
//  (easy to test - open website, close server, click "move", start server)
 */

// docs
{
	/*
	pilotData = {
		model: {
			id
			name
			main
			squad
			shipsSub
			shipsAll
			timeActive
			timeWaitlist
			timeTotal
			ship
			system
		}
		rowDOM
		cellsDOM
	}
	 */
}

let socket = io({
	autoConnect: false,
	query: {
		user: SERV_user
	} });

socket.on("connect_error", (err) => {
	console.log(`socket: connect_error due to ${err.message}`);
	updateServerStatus('Connection error', 'redLabel');
	//if (err.message === "invalid username") {
	//	alert('Connection error');
	//}
});

socket.on("connect", () => {
	socket.sendBuffer = [];
	console.log('socket: on connect');

	socket.emit('listenForFleet', { fleetId: SERV_fleetId });
});

let globalData = {
	// currentSquad
	// waitlistSquad
	// currentBoss
};

// by pilot name
let gPilotsData = {};
let gMain;
let gMainHead;
let gErrorDiv;
let gSmallErrorDiv;
let gServerStatusDiv;
let gServerStatusTime;
let gSquadsData = {};
let gActive = false;

let gCurrentSquadDropmenu;
let gWaitlistSquadDropmenu;
let gFleetBossDropmenu;
let gFleetTypeDropmenu;
let gIncursionTypeDropmenu;
let gIncursionTypeLabel;
let gConfigDiv;

let gGroupingOption ='all';

function onSmallServerError(error) {

	let smallError = createDiv(gSmallErrorDiv, 'Error occured: ' + error, 'smallErrorDiv');

	setTimeout(() => {
		gSmallErrorDiv.removeChild(smallError);
	}, 15*1000);
}

function onServerError(error) {
	gErrorDiv.innerHTML = '';
	gErrorDiv.style.display = 'block';

	let msg = createDiv(gErrorDiv, 'Server error! ' + (error ||''));
	let btn = addButton(gErrorDiv, 'Retry', callback, 'errorBtn');

	function callback() {
		socket.emit('resetError', { fleetId: SERV_fleetId });
		gErrorDiv.innerHTML = '';
		gErrorDiv.style.display = 'none';
	}
};

$(document).ready(() => {
	gMain = document.getElementById('main');

	socket.on('fleet_data', onFleetData);
	socket.on('fleet_config', onFleetConfig);
	socket.on('squads_list', onSquadsList);
	socket.on('fleet_error', (arg) => onServerError(arg.error));
	socket.on('small_error', (arg) => onSmallServerError(arg.error));

	if (!IS_TEST) {
		socket.auth = { username: "Bob" };
		socket.connect();
		setInterval(checkConnectionLoop, 1000);
	}

	setupHeader();
	setupFleetConfig();
	setupTableTabs();
	setupFleetTable();

	if (IS_TEST) {
		setupDevTest();
	}

	gActive = true;
})


function setupFleetConfig() {
	gConfigDiv = createDiv(gMain, '', 'configDiv');

	let squadOptions = getSquadList();

	let currLine = createDiv(gConfigDiv);
	createLabel(currLine, 'My active squad: ');
	let activeSquad = globalData.currentSquad || 'select';
	gCurrentSquadDropmenu = createDropDownMenu(currLine, activeSquad, selectActiveSquad, squadOptions, { btnCss: 'squadBtns' });
	gCurrentSquadDropmenu.style['margin-right'] = '25px';

	createLabel(currLine, 'Waitlist squad: ');
	let waitlistSquad = globalData.waitlistSquad || 'select';
	gWaitlistSquadDropmenu = createDropDownMenu(currLine, waitlistSquad, selectWaitlistSquad, squadOptions, { btnCss: 'squadBtns' });

	let btn = addButton(currLine, 'refresh', refreshSquads, 'refreshSquads');

	let pilotsList = getAllPilotNames();
	//

	//let currLine = line1; //createDiv(gConfigDiv);
	let boss_label = createLabel(currLine, 'Boss: ');
	boss_label.style['margin-left'] = '100px';
	let activeBoss = globalData.currentBoss;
	gFleetBossDropmenu = createDropDownMenu(currLine, activeBoss, selectCurrentBoss, pilotsList, { btnCss: 'squadBtns' });

	//
	let boss2_label = createLabel(currLine, "(can't find boss? type here)")
	boss2_label.style['margin-left'] = '40px';
	boss2_label.style['fontSize'] = '13px';
	let boss2_input = document.createElement('input');
	boss2_input.classList.add('boss2Input');
	currLine.appendChild(boss2_input);

	addButton(currLine, '>', function () {
		let boss = boss2_input.value;
		boss2_input.value = '';
		socket.emit('setFleetConfig', { fleetId: SERV_fleetId, currentBoss: boss });
	}, 'boss2Btn');


	//////
	currLine = createDiv(gConfigDiv);
	currLine.style['margin-top'] = '5px';

	createLabel(currLine, 'Fleet type: ');
	gFleetTypeDropmenu = createDropDownMenu(currLine, globalData.fleetType, selectFleetType, ['Other', 'Incursion', 'Move op', 'WH'], { btnCss: 'squadBtns' });


	gIncursionTypeLabel = createLabel(currLine, 'Incursion type: ');
	gIncursionTypeLabel.style['margin-left'] = '40px';
	gIncursionTypeDropmenu = createDropDownMenu(currLine, globalData.incursionType, selectIncursionType, ['', 'Vanguards', 'Assaults', 'Headquarters'], { btnCss: 'squadBtns' });


	let rem_btn = addButton(currLine, 'Remove fleet', function () {
		if (confirm("Do you want to remove fleet from database?")) {
			socket.emit('removeFleet', { fleetId: SERV_fleetId });
		}
	}, 'removeFleetBtn');
}


function getAllPilotNames() {
	let names = [];
	for (let name in gPilotsData) {
		names.push(name);
	}
	return names.sort();
}

function findSquadIdOfName(argName) {
	for (let it in gSquadsData) {
		let squad = gSquadsData[it].name;
		if (squad == argName) return it;
	}
	return null;
}

function selectActiveSquad(event) {
	let chosen = event.target.textContent;

	globalData.currentSquadId = findSquadIdOfName(chosen);
	globalData.currentSquad = chosen;
	updateCurrentSquad();
}

function selectWaitlistSquad(event) {
	let chosen = event.target.textContent;

	//socket.emit('setFleetConfig', { fleetId: SERV_fleetId, waitlistSquadId: findSquadIdOfName(chosen) });
	globalData.waitlistSquadId = findSquadIdOfName(chosen);
	globalData.waitlistSquad = chosen;
	updateWaitlistSquad();
}

function selectCurrentBoss(event) {
	let chosen = event.target.textContent;
	socket.emit('setFleetConfig', { fleetId: SERV_fleetId, currentBoss: chosen });
}

function selectFleetType(event) {
	let chosen = event.target.textContent;
	socket.emit('setFleetConfig', { fleetId: SERV_fleetId, fleetType: chosen });
}

function selectIncursionType(event) {
	let chosen = event.target.textContent;
	socket.emit('setFleetConfig', { fleetId: SERV_fleetId, incursionType: chosen });
}


function refreshSquads() {
	socket.emit('getSquadsList', { fleetId: SERV_fleetId });
}

function setupDevTest() {
	gActive = true;
	socket.emit = function (name) { console.log('socket.emit ' + name); }

	let squads = {
		'1': { name: 'Squad 1' },
		'2': { name: 'Squad 2' },
		'3': { name: 'Waitlist' },
		'4': { name: 'Alt' },
	};

	let currentBoss = 'lethern Zell';
	let model = generateTestModel();

	onSquadsList({ squads, currentBoss });

	globalData.currentSquadId = 1;
	globalData.waitlistSquadId = 3;
	updateCurrentSquadDropmenu();


	onFleetData({ pilots: model });
}

function onFleetConfig(args) {
	if (!gActive) return;

	if (args.currentBoss) {
		globalData.currentBoss = args.currentBoss;
		gFleetBossDropmenu._btn.textContent = args.currentBoss;
	}

	if (args.fleetType) {
		globalData.currentBoss = args.fleetType;
		gFleetTypeDropmenu._btn.textContent = args.fleetType;

		gIncursionTypeDropmenu._btn.style.display = (args.fleetType == 'Incursion') ? 'inline-block' : 'none';
		gIncursionTypeLabel.style.display = (args.fleetType == 'Incursion') ? 'inline-block' : 'none';
	}

	if (args.incursionType !== undefined) {
		globalData.incursionType = args.incursionType;
		gIncursionTypeDropmenu._btn.textContent = args.incursionType;
	}
}

function onSquadsList(args) {
	if (args.error) {
		onSmallServerError('Squads List: '+args.error);
		return;
	}

	if (!gActive) return;

	if (args.squads) {
		gSquadsData = args.squads;
		updateCurrentSquadDropmenu();
	}
}

function updateCurrentSquad() {
	let activeSquad = globalData.currentSquad || 'select';
	gCurrentSquadDropmenu._btn.textContent = activeSquad;
}

function updateWaitlistSquad() {
	let waitlistSquad = globalData.waitlistSquad || 'select';
	gWaitlistSquadDropmenu._btn.textContent = waitlistSquad;
}

function getSquadList() {
	let squadOptions = [];
	for (let it in gSquadsData) {
		let squad = gSquadsData[it].name;
		squadOptions.push(squad);
	}
	return squadOptions.sort();
}

function updateCurrentSquadDropmenu() {
	globalData.currentSquad = (gSquadsData[globalData.currentSquadId] || {}).name;
	globalData.waitlistSquad = (gSquadsData[globalData.waitlistSquadId] || {}).name;

	let squadOptions = getSquadList();
	updateDropDownMenu(gCurrentSquadDropmenu, squadOptions, selectActiveSquad);
	updateDropDownMenu(gWaitlistSquadDropmenu, squadOptions, selectWaitlistSquad);

	let pilotsList = getAllPilotNames();
	updateDropDownMenu(gFleetBossDropmenu, pilotsList, selectCurrentBoss);
}


function onFleetData(args) {
	if (args.error) {
		onServerError(args.error);
		return;
	}

	if (!gActive) return;

	// dont change the "Connected" string
	updateServerStatus('Connected', 'greenLabel');
	gServerStatusTime = new Date();

	let model = args.pilots;

	model.sort((a, b) => a.name.localeCompare(b.name));
	
	try {
		//pilotData
		updateFleetModel(model);
		
	} catch (e) {
		console.log(e);
		onSmallServerError('Client error');
	}

	if (Object.keys(gSquadsData).length === 0) {
		socket.emit('getSquadsList', { fleetId: SERV_fleetId });
	}
}

function updateFleetModel(model) {
	for (let name in gPilotsData) {
		let obj = gPilotsData[name];
		obj.inactive = true;
	}

	for (let entry in model) {
		let pilotModel = model[entry];
		let name = pilotModel.name;

		let obj = gPilotsData[name];
		if (!obj) {
			obj = gPilotsData[name] = {};
		}
		obj.model = pilotModel;
		obj.inactive = false;
	}

	renderRows();

	rerenderTable();

	for (let name in gPilotsData) {
		let obj = gPilotsData[name];
		if (obj.inactive) {
			updateRow_inactive(obj);

			if (!obj.inactive_time) {
				obj.inactive_time = new Date();
			} else {
				let diff = (new Date()) - obj.inactive_time;
				if (diff > 3 * 60 * 1000) {
					removeRow_inactive(obj);
					delete gPilotsData[name];
				}
			}
		}
	}
}


function renderRows() {
	for (let name in gPilotsData) {
		let pilotData = gPilotsData[name];
		if (pilotData.inactive) continue;

		updateRow(pilotData);
	}
}

function checkConnectionLoop() {
	if (!gServerStatusTime) return;
	if (!gServerStatusDiv) return;
	if (!gServerStatusDiv.textContent.startsWith('Connected') && !gServerStatusDiv.textContent.startsWith('?')) return;
	let diff = (new Date()) - gServerStatusTime;

	diff = Math.round(diff / 1000);
	
	if (diff > 30) {
		gServerStatusDiv.textContent = '? (' + diff + ')';
		gServerStatusDiv.classList.add('redLabel');
	} else if (diff > 6) {
		gServerStatusDiv.textContent = 'Connected (' + diff + ')';
		gServerStatusDiv.classList.add('yellowLabel');
	} else {
		gServerStatusDiv.textContent = 'Connected';
	}
}

function createDiv(parent, text, css) {
	let div = document.createElement('div');
	if (css) div.classList.add(css);
	div.textContent = text;
	parent.appendChild(div);
	return div;
}

function createSpan(parent, text, css) {
	let div = document.createElement('span');
	if (css) div.classList.add(css);
	div.textContent = text;
	parent.appendChild(div);
	return div;
}

function createLabel(parent, text) {
	let label = createSpan(parent, text);
	label.style["margin-right"] = "6px";
	return label;
}

function setupHeader() {
	gMainHead = createDiv(gMain, '');

	let statusDiv = createDiv(gMainHead, '', 'smallFont');

	let srv = createLabel(statusDiv, 'Server: ');

	gServerStatusDiv = createSpan(statusDiv, '');
	updateServerStatus('Connecting...');

	if (IS_TEST) {
		let testDiv = createDiv(gMainHead, 'TEST');
		testDiv.style['font-size'] = '50px';
	}
	// tabs
	let configTabBtn = addButton(statusDiv, 'Config', onConfigTab, 'tabBtn');
	configTabBtn.style['margin-left'] = '50px';

	// setupErrorDiv
	gErrorDiv = createDiv(gMainHead, '', 'errorDiv');
	gErrorDiv.style.display = 'none';

	gSmallErrorDiv = createDiv(gMainHead, '');
};

function onConfigTab() {
	if (gConfigDiv.style.display == 'none')
		gConfigDiv.style.display = 'block';
	else
		gConfigDiv.style.display = 'none';
}

function updateServerStatus(text, css) {
	if (!gServerStatusDiv) return;
	gServerStatusDiv.textContent = text;
	gServerStatusDiv.classList.remove(...gServerStatusDiv.classList);

	if (css) {
		gServerStatusDiv.classList.add(css);
	}
};

let colsStruct = [
	{ name: 'name',			label: 'Pilot', width: 200},
	{ name: 'squad',		label: 'Squad', width: 120},
	{ name: 'squadBtn',		label: '', width: 40},
	{ name: 'ship',			label: 'Ship', width: 170},
	{ name: 'system',		label: 'System', width: 80 },

	{ name: 'shipsSub',		label: 'Will fly', width: 100, disabled: 1 },
	{ name: 'shipsAll',		label: 'Can fly', width: 100, disabled: 1 },
	{ name: 'timeActive',	label: 'Time Active', width: 60, disabled: 1 },
	{ name: 'timeWaitlist', label: 'Time Waitlist', width: 60, disabled: 1 },

	{ name: 'timeTotal',	label: 'Time total', width: 40},
];

function setupTableTabs() {
	let tabs = createDiv(gMain, '', 'tableTabs');

	createLabel(tabs, 'Group by:');
	addButton(tabs, 'All', onTab.bind(null, 'all'));
	addButton(tabs, 'Squads', onTab.bind(null,'squads'));
	addButton(tabs, 'Main-Alt', onTab.bind(null,'alts'));

	function onTab(param) {
		if (gGroupingOption == 'alts' && param == 'alts') {
			gGroupingOption = 'alts2';
		} else if (gGroupingOption == 'alts2' && param == 'alts') {
			gGroupingOption = 'alts';
		}else {
			gGroupingOption = param;
		}
		rerenderTable();
	}
}

function setupFleetTable() {

	globalData.fleetTablesDOM = createDiv(gMain, '');

	globalData.tables = {};

	getOrCreateTable('all');
};

function addCell(parent, text, cssClss) {
	let cell = document.createElement('div');
	if (cssClss) cell.classList.add(cssClss);
	parent.appendChild(cell);
	cell.textContent = text;
	return cell;
}

function addButton(parent, text, callback, cssClss) {
	let cell = document.createElement('div');
	cell.classList.add('textButton');
	if (cssClss) cell.classList.add(cssClss);
	
	parent.appendChild(cell);
	cell.textContent = text;
	if (callback) cell.addEventListener('click', callback);
	return cell;
}

function moveToSquad(event) {
	let squad_down = event.target;
	let pilotData = squad_down.pilotData;
	let targetSquad = squad_down.targetSquad;
	if (!targetSquad) return;

	squad_down.classList.remove(...squad_down.classList);
	squad_down.textContent = 'moving...';
	squad_down.targetSquad = null;

	let pilotId = pilotData.model.id;
	let squadId = findSquadIdOfName(targetSquad);

	socket.emit('moveMember', { fleetId: SERV_fleetId, squadId, pilotId });

	//the_webmethod_callback(pilotData, targetSquad);

	//function the_webmethod_callback(pilotData, targetSquad) {
	//	pilotData.model.squad = targetSquad;
	//	updateRow(pilotData);
	//};
};

function onShowBtnMenu(event) {
	let btnDiv = event.target;
	let dropmenu = btnDiv.parentNode.parentNode;

	if (btnDiv.textContent == 'Connect to main')
		showConnectToMain(dropmenu);
	//btnDiv.menuDOM.style.display = 'block';
	//$(btnDiv.dropmenuDOM).dropdown();
}


function showConnectToMain(dropmenu) {

	let parent = dropmenu.parentNode;
	let pilots = getAllPilotNames();


	if (dropmenu.connectDropmenu) {
		clearChildren(dropmenu.connectDropmenu._btn);
		clearChildren(dropmenu.connectDropmenu);
		parent.removeChild(dropmenu.connectDropmenu);
		dropmenu.connectDropmenu.dropmenu = null;
	}

	dropmenu.connectDropmenu = createDropDownMenu(parent, '', onConnectToMain, pilots, { btnCss: 'connectBtns' });
	dropmenu.connectDropmenu.dropmenu = dropmenu;
	

	setTimeout(function () {
		$(dropmenu.connectDropmenu._btn).dropdown('toggle')
	}, 10);
}

function onConnectToMain(event) {
	let btnDiv = event.target;
	let dropmenu = btnDiv.parentNode.parentNode.dropmenu;
	let pilotData = dropmenu.pilotData;

	let selectedMain = btnDiv.textContent;
	let selectedAlt = pilotData.model.name;

	socket.emit('connectAltToMain', {
		fleetId: SERV_fleetId,
		selectedMain,
		selectedAlt
	});
}


function addDropDownButton(parent, text, callback, cssClss) {
	let cell = document.createElement('a');
	cell.classList.add('dropdown-item');
	if (cssClss) cell.classList.add(cssClss);

	parent.appendChild(cell);
	cell.textContent = text;
	if (callback) cell.addEventListener('click', callback);
	return cell;
}

function createDropDownMenu(parent, text, onClick, options, config) {
	if (!config) config = {};
	let dropmenu = createDiv(parent, '', 'dropdown');

	let btn = addButton(dropmenu, text, null, config.btnCss);
	dropmenu._btn = btn;
	btn.classList.add('dropdown-toggle');
	btn.setAttribute('data-toggle', "dropdown");

	let menu = createDiv(dropmenu, '', 'dropdown-menu');
	dropmenu._menu = menu;

	for (let op of options) {
		addDropDownButton(menu, op, onClick);
	}

	$(btn).dropdown();

	return dropmenu;
}

function updateDropDownMenu(dropmenu, options, onClick) {
	let menu = dropmenu._menu;
	menu.innerHTML = '';

	for (let op of options) {
		addDropDownButton(menu, op, onClick);
	}
}

function setupPilotBtns(pilotData) {
	let btnsDiv = pilotData.cellsDOM['squadBtn'];

	let options = [];
	//if (!pilotData.model.main) {
	options.push('Connect to main');
	//}
	//options.push('test');

	let dropmenu = createDropDownMenu(btnsDiv, '...', onShowBtnMenu, options, { btnCss: 'pilotBtns' });

	dropmenu.pilotData = pilotData;

	{
		/*
		let dropmenu = createDiv(btnsDiv, '', 'dropdown');
	
	
		let btn = addButton(dropmenu, '...', showBtnMenu, 'pilotBtns');
		btn.classList.add('dropdown-toggle');
		btn.pilotData = pilotData;
		btn.dropmenuDOM = dropmenu;
		btn.setAttribute('data-toggle', "dropdown");
	
		let menu = createDiv(dropmenu, '', 'dropdown-menu');
		//menu.style.display = 'none';
	
		$(btn).dropdown();
		
		btn.menuDOM = menu;
	
		if (!pilotData.model.gMain) {
			addButton(menu, 'Connect to main');
		}
	
		*/
		//addButton(menu, '2');
		// 
	}
}

function addRow(pilotData) {
	let model = pilotData.model;

	let row = createDiv(getOrCreateTable('all')._body, '', 'fleetRow');
	pilotData.rowDOM = row;
	movePilotToTable(pilotData);

	let cells = {};
	pilotData.cellsDOM = cells;


	for (let col of colsStruct) {
		if (col.disabled) continue;
		let name = col.name;

		switch (name) {
			case 'name':
				cells['name'] = addCell(row, '');
				cells['name_up'] = addCell(cells['name'], '');
				if (model.main) {
					cells['name_down'] = addCell(cells['name'], '', 'altNameImg');
					cells['name_down'] = addCell(cells['name'], '', 'altName');
				}
			break;
			case 'squad':
				cells['squad'] = addCell(row, '');
				cells['squad_up'] = addCell(cells['squad'], '');
				cells['squad_down'] = addButton(cells['squad'], '', moveToSquad, 'blueSquad');
				cells['squad_down'].pilotData = pilotData;
			break;
			case 'squadBtn':
				cells['squadBtn'] = addCell(row, '');
			break;
			case 'ship':
				cells['ship'] = addCell(row, '');
				cells['ship_icon'] = createDiv(cells['ship'], '', 'ship_icon');
				cells['ship_name'] = createDiv(cells['ship'], '', 'ship_name');
			break;
			case 'system':
				cells['system'] = addCell(row, '');
			break;
			case 'shipsSub':
				cells['shipsSub'] = addCell(row, '');
			break;
			case 'shipsAll':
				cells['shipsAll'] = addCell(row, '');
			break;
			case 'timeActive':
				cells['timeActive'] = addCell(row, '');
			break;
			case 'timeWaitlist':
				cells['timeWaitlist'] = addCell(row, '');
			break;
			case 'timeTotal':
				cells['timeTotal'] = addCell(row, '');
			break;
		}
	}
	
	setupPilotBtns(pilotData);

	if (!model.main) row.classList.add('rowMain')
	else row.classList.add('rowAlt');
};

function getOrCreateTable(name) {
	if (!globalData.tables[name]) {
		
		let fleetTable = createDiv(globalData.fleetTablesDOM, '', 'fleetTable');
			//createDiv(globalData.fleetTablesDOM, '', 'fleetBody');
		globalData.tables[name] = fleetTable;

		let caption = createDiv(fleetTable, name, 'fleetHeadCaption');
		caption.addEventListener('click', onHeadCaptionClick);
		fleetTable._caption = caption;

		let colgroup = createDiv(fleetTable, '', 'fleetColGroup');

		let ths = createDiv(fleetTable, '', 'fleetHeadGroup');
		fleetTable._ths = ths;

		for (let col of colsStruct) {
			if (col.disabled) continue;

			let colDiv = createDiv(colgroup, '', 'fleetColumn');
			colDiv.style.width = col.width + 'px';

			let th = createDiv(ths, col.label, 'fleetHeader');
			th.addEventListener('click', onHeadColumnClick);
		}

		fleetTable._body = createDiv(fleetTable, '', 'fleetBody');
		fleetTable._add = [];
	}
	return globalData.tables[name];
}

function onHeadCaptionClick(event) {
	let caption = event.target;
	let table = caption.parentNode;
	if (table._collapsed) {
		table._body.style.display = 'table-row-group';
		table._ths.style.display = 'table-header-group';
	} else {
		table._body.style.display = 'none';
		table._ths.style.display = 'none';
	}
	table._collapsed = !table._collapsed;
}

function onHeadColumnClick(event) {
	let caption = event.target;
	let table = caption.parentNode.parentNode;
	let sortName = caption.textContent;

	let sortFunc;
	switch (sortName) {
		case 'Pilot': sortFunc = (a, b) => a.model.name.localeCompare(b.model.name); break;
		case 'Squad': sortFunc = (a, b) => (a.model.squad+'').localeCompare(b.model.name+''); break;
		case 'Ship': sortFunc = (a, b) => (a.model.ship+'').localeCompare(b.model.ship+''); break;
		case 'System': sortFunc = (a, b) => (a.model.system+'').localeCompare(b.model.system+''); break;
		case 'Time total': sortFunc = (a, b) => {
			//return a.model.timeTotal.localeCompare(b.model.timeTotal);

			let aT = +a.model.timeTotal;
			let bT = +b.model.timeTotal;
			if (aT == bT) return 0;
			return aT < bT ? 1 : -1;
		}; break;
	}
	if (sortFunc) {
		table._sort = sortFunc;
		if (table._sortName == sortName)
			table._sortReverse = !table._sortReverse;
		else
			table._sortReverse = false;
		table._sortName = sortName;
		rerenderTable();
	} else {
		console.log('no sortFunc for ' + sortName);
	}
}

function movePilotToTable(pilotData) {
	switch (gGroupingOption) {
		case 'all':
			//getOrCreateTable('all')._body.appendChild(row);
			getOrCreateTable('all')._add.push(pilotData);
			
			break;
		case 'squads':
			//globalData.fleetBody = createDiv(fleetTable, '', 'fleetBody');
			let squad = pilotData.model.squad;
			if (['all', 'alts'].includes(squad)) squad = squad + '_';

			getOrCreateTable(squad)._add.push(pilotData);
			break;
		case 'alts':
			if (pilotData.model.main) {
				getOrCreateTable('alts')._add.push(pilotData);
			} else {
				getOrCreateTable('all')._add.push(pilotData);
			}
			break;
		case 'alts2':
			getOrCreateTable('alts')._add.push(pilotData);
			break;
	}
}

function rerenderTable() {

	// detach all
	let tmp = document.createDocumentFragment();
	for (let name in gPilotsData) {
		let pilotData = gPilotsData[name];
		tmp.appendChild(pilotData.rowDOM);
	}

	for (let name in gPilotsData) {
		let pilotData = gPilotsData[name];

		movePilotToTable(pilotData);
	}

	// render / cleartables
	for (let it in globalData.tables) {
		let table = globalData.tables[it];

		if (['alts', 'alts2'].includes(gGroupingOption) && it == 'alts') {
			table._add.sort((a, b) => {
				a = a.model;
				b = b.model;
				if (a.main && a.main == b.main) {
					return a.name.localeCompare(b.name)
				}

				if (a.name == b.main) return -1;
				if (b.name == a.main) return 1;

				let Aname = a.name;
				let Bname = b.name;
				if (a.main) Aname = a.main;
				if (b.main) Bname = b.main;
				return Aname.localeCompare(Bname);
			});
		} else if (table._sort) {
			if (table._sortReverse) {
				table._add.sort((a, b) => {
					let res = table._sort(a, b);
					if (res > 0) return -1;
					if (res < 0) return 1;
					return res;
				});
			} else {
				table._add.sort(table._sort);
			}
		}

		for (let row of table._add) {
			table._body.appendChild(row.rowDOM);
		}

		//obj.inactive
		table._caption.textContent = it + '  [' + table._add.reduce((sum, elem) => sum + (elem.inactive? 0:1), 0)+ ']';

		table._add = [];
		

		if (!table._body.children.length) {
			table.parentNode.removeChild(table);
			delete globalData.tables[it];
		}

		
	}


	// sort order of tables
	let tmp2 = document.createDocumentFragment();
	for (let it in globalData.tables) {
		let table = globalData.tables[it];
		tmp2.appendChild(table); //table.parentNode.removeChild(table);
	}
	// add main
	if (globalData.tables['all']) globalData.fleetTablesDOM.appendChild(globalData.tables['all']);
	// waitlist? first
	let waitlist = globalData.waitlistSquad;
	if (waitlist) {
		if (globalData.tables[waitlist]) globalData.fleetTablesDOM.appendChild(globalData.tables[waitlist]);
		else waitlist = null;
	}
	// add squads
	let its1 = Object.keys(globalData.tables).filter(n => n.toLowerCase().startsWith('squad'))
	let its2 = Object.keys(globalData.tables).filter(n => !n.toLowerCase().startsWith('squad'))
	let its = its1.sort().concat(its2.sort());
	
	for (let it of its) {
		if (['all', 'alts'].includes(it)) continue;
		if (waitlist == it) continue;
		let table = globalData.tables[it];
		globalData.fleetTablesDOM.appendChild(table);
	}
	// add alts
	if (globalData.tables['alts']) globalData.fleetTablesDOM.appendChild(globalData.tables['alts']);
}

function removeRow_inactive(pilotData) {
	let parent = pilotData.rowDOM.parentNode;
	if(parent)
		parent.removeChild(pilotData.rowDOM);
	//globalData.fleetBody.removeChild(pilotData.rowDOM);
}

function clearChildren(elem) {
	if (!elem) return;
	while (elem.firstChild) {
		elem.removeChild(elem.firstChild);
	}
};

function updateRow_inactive(pilotData) {
	let cells = pilotData.cellsDOM;

	cells['squad_up'].classList.remove('orangeSquad');
	cells['squad_up'].classList.remove('greenSquad');
	cells['squad_up'].classList.add('redSquad');

	cells['squad_up'].textContent = 'missing';

	cells['squad_down'].textContent = '';
	cells['squad_down'].targetSquad = null;
}

function updateRow(pilotData) {
	if (!pilotData.cellsDOM) {
		addRow(pilotData);
	}

	let cells = pilotData.cellsDOM;
	let model = pilotData.model;

	let inFleet_mins= model.timeTotal;
	let inFleet = Math.floor(inFleet_mins / 60) + "h " + (Math.round(inFleet_mins % 60) + '').padStart(2, '0') + 'm'

	for (let col of colsStruct) {
		if (col.disabled) continue;
		let name = col.name;

		switch (name) {
			case 'name':
				cells['name_up'].textContent = model.name;
				if (model.main) {

					if (!cells['name_down']) {
						cells['name_down'] = addCell(cells['name'], '', 'altNameImg');
						cells['name_down'] = addCell(cells['name'], '', 'altName');
					}

					cells['name_down'].textContent = model.main;
				}
			break;
			case 'squad':
				cells['squad_up'].textContent = model.squad;
				if (model.squadChanging) {
					cells['squad_down'].textContent = 'changing...';
				} else {
					if (globalData.currentSquad && globalData.currentSquad == model.squad) {
						cells['squad_up'].classList.remove('orangeSquad');
						cells['squad_up'].classList.remove('redSquad');
						cells['squad_up'].classList.add('greenSquad');

						cells['squad_down'].textContent = (globalData.waitlistSquad ? globalData.waitlistSquad + ' <-' : '');
						cells['squad_down'].targetSquad = globalData.waitlistSquad;
						cells['squad_down'].classList.add('blueSquad', 'textButton');
					} else {
						cells['squad_up'].classList.remove('greenSquad');
						cells['squad_up'].classList.remove('redSquad');
						cells['squad_up'].classList.add('orangeSquad');

						cells['squad_down'].textContent = (globalData.currentSquad ? '-> ' + globalData.currentSquad : '');
						cells['squad_down'].targetSquad = globalData.currentSquad;
						cells['squad_down'].classList.add('blueSquad', 'textButton');
					}
				}
			break;
			case 'squadBtn':
			break;
			case 'ship':
				cells['ship_icon'].style['background-color'] = shipToColor(model.ship);
				cells['ship_name'].textContent = model.ship;
			break;
			case 'system':
				cells['system'].textContent = model.system;
			break;
			case 'shipsSub':
				cells['shipsSub'].textContent = model.shipsSub.join('\n');
			break;
			case 'shipsAll':
				cells['shipsAll'].textContent = model.shipsAll.join('\n');
			break;
			case 'timeActive':
				cells['timeActive'].textContent = model.timeActive;
			break;
			case 'timeWaitlist':
				cells['timeWaitlist'].textContent = model.timeWaitlist;
			break;
			case 'timeTotal':
				cells['timeTotal'].textContent = inFleet;
			break;
		}
	}
	
};

let shipToColorMap = {
	// DPS
	'Gila': '#c23333',
	'Praxis': '#c23333',
	'Ishtar': '#c23333',
	'Rattlesnake': '#c23333',
	// Logi
	'Basilisk': '#4a6fda',
	// DDD
	'Gnosis': '#c28233',
	'Rapier': '#c28233',
	'Huginn': '#c28233',
	'Tengu': '#c28233',
	'Nighthawk': '#c28233',
	// ?
	'Catalyst': '#33c25f',
	'Bestower': '#33c25f',
	'Drake': '#33c25f',
	'Phantasm': '#33c25f',
	'Drekavac': '#33c25f',
	'Vulture': '#33c25f',
	//
	'Capsule': '#e9e9e9',
}

function shipToColor(name) {
	return shipToColorMap[name] || '';
}
