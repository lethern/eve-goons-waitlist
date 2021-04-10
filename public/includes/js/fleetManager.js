{
	/*
	function generateTestModel() {
		return [{
			name: 'lethern Zell',
			main: null,
			squad: 'Fleet 1',
			shipsSub: ['basi', 'huginn', 'gila'],
			shipsAll: ['gnosis', 'praxi'],
			timeActive: '1:30',
			timeWaitlist: '-',
			timeTotal: '1:38',
			ship: 'Basilisk',
			system: 'Jita',
		},{
			name: 'saelen saal',
			main: 'lethern Zell',
			squad: 'Waitlist',
			shipsSub: ['gila'],
			shipsAll: ['gnosis', 'praxi'],
			timeActive: '0:15',
			timeWaitlist: '0:30',
			timeTotal: '1:38',
			ship: 'Capsule',
			system: 'Hek',
		},{
			name: 'Johny Bravo',
			main: null,
			squad: 'Waitlist',
			shipsSub: ['gila'],
			shipsAll: [],
			timeActive: '-',
			timeWaitlist: '0:10',
			timeTotal: '0:10',
			ship: 'Gila',
			system: 'Jita',
		},{
			name: 'Bob bobman',
			main: null,
			squad: 'Waitlist',
			shipsSub: ['gila', 'praxi'],
			shipsAll: [],
			timeActive: '-',
			timeWaitlist: '0:17',
			timeTotal: '0:17',
			ship: 'Gila',
			system: 'Jita',
		},{
			name: 'Alice bobman',
			main: 'Bob bobman',
			squad: 'Waitlist',
			shipsSub: ['gila', 'praxi'],
			shipsAll: [],
			timeActive: '-',
			timeWaitlist: '0:17',
			timeTotal: '0:17',
			ship: 'Capsule',
			system: 'Jita',
		},{
			name: 'Denise bobman',
			main: 'Bob bobman',
			squad: 'Waitlist',
			shipsSub: ['praxi'],
			shipsAll: [],
			timeActive: '-',
			timeWaitlist: '0:17',
			timeTotal: '0:17',
			ship: 'Gila',
			system: 'Jita',
		}];
	};
	*/
}

// docs
{
	/*
	pilotData = {
		model: {
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

let socket = io({ autoConnect: false });

socket.on("connect_error", (err) => {
	console.log(`socket: connect_error due to ${err.message}`);
	updateServerStatus('Connect error', 'redLabel');
	//if (err.message === "invalid username") {
	//	alert('Connection error');
	//}
});

socket.on("connect", () => {
	socket.sendBuffer = [];
	console.log('socket: on connect');

	socket.emit('listenForFleet', { fleetId: SERV_fleetId });
	socket.emit('getSquadsList', { fleetId: SERV_fleetId });
});

let globalData = {
	// currentSquad
	// waitlistSquad
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

function onSmallServerError(error) {

	let smallError = createDiv(gSmallErrorDiv, 'Error occured! ' + error);

	setTimeout(() => {
		gSmallErrorDiv.removeChild(smallError);
	}, 15*1000);
}

function onServerError(error) {
	gErrorDiv.innerHTML = '';
	gErrorDiv.style.display = 'block';

	let msg = createDiv(gErrorDiv, 'Error occured! ' + error);
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
	socket.on('squads_list', onSquadsList);

	socket.connect();

	setupHeader();
	setupFleetConfig();
	setupFleetTable();

	gActive = true;

	{
		/*
		let model = JSON.parse(SERV_pilots);
		//let model = generateTestModel();
		let data = [];
		for (let entry in model) {
			let pilotData = {};
			pilotData.model = model[entry];
	
			addRow(pilotData);
	
			data.push(pilotData);
		}
		*/
	}

	setInterval(checkConnectionLoop, 1000);
})

function setupFleetConfig() {
	let configDiv = createDiv(gMain);

	let squadOptions = [];
	for (let it in gSquadsData) {
		let squad = gSquadsData[it].name;
		squadOptions.push(squad);
	}

	let line1 = createDiv(configDiv);
	createLabel(line1, 'Active squad: ');
	let activeSquad = globalData.currentSquad || 'select';
	let dropmenu = createDropDownMenu(line1, activeSquad, showBtnMenu, squadOptions, { btnCss: 'squadBtns' });

	//globalData.currentSquad = (squads[currentSquadId] || {}).name;
	//globalData.waitlistSquad

	let btn = addButton(line1, 'refresh', refreshSquads, 'refreshSquads');
}

function selectActiveSquad(event) {
	let chosen = event.target.textContent;
	alert(chosen);
}

function refreshSquads() {
	socket.emit('getSquadsList', { fleetId: SERV_fleetId });
}

function onSquadsList(args) {
	if (args.error) {
		onSmallServerError('Squads List: '+args.error);
		return;
	}

	if (!gActive) return;

	let squads = args.squads;
	if (!squads) return;

	gSquadsData = squads;
	let currentSquadId = args.currentSquadId;
	let waitlistSquadId = args.waitlistSquadId;

	globalData.currentSquad = (squads[currentSquadId] || {}).name;
	globalData.waitlistSquad = (squads[waitlistSquadId] || {}).name;
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

	model.sort((a, b) => a.name - b.name);

	//let model = generateTestModel();
	try {
		for (let entry in model) {
			renderRow(model[entry]);
		}
	} catch (e) {
		console.log(e);
		onSmallServerError('Client error');
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

function createLabel(parent, text) {
	let label = createDiv(parent, text, 'mySpan');
	label.style["margin-right"] = "4px";
	return label;
}

function setupHeader() {
	gMainHead = createDiv(gMain, '');

	let statusDiv = createDiv(gMainHead, '', 'smallFont');

	let srv = createLabel(statusDiv, 'Server: ');

	gServerStatusDiv = createDiv(statusDiv, '', 'mySpan');
	updateServerStatus('Connecting...');

	// setupErrorDiv
	gErrorDiv = createDiv(gMainHead, '', 'gErrorDiv');
	gErrorDiv.style.display = 'none';

	gSmallErrorDiv = createDiv(gMainHead, '');
};

function updateServerStatus(text, css) {
	if (!gServerStatusDiv) return;
	gServerStatusDiv.textContent = text;
	gServerStatusDiv.classList.remove(...gServerStatusDiv.classList);

	gServerStatusDiv.classList.add('mySpan');
	
	if (css) {
		gServerStatusDiv.classList.add(css);
	}
};

function renderRow(pilotModel) {
	let name = pilotModel.name;
	let obj = gPilotsData[name];
	if (obj) {
		obj.model = pilotModel;
		updateRow(obj);
	} else {
		obj = gPilotsData[name] = {};
		obj.model = pilotModel;
		addRow(obj);
	}
}

let colsStruct = [
	{ name: 'name',			label: 'Pilot', width: 200},
	{ name: 'squad',		label: 'Squad', width: 150},
	{ name: 'squadBtn',		label: '', width: 50},
	{ name: 'ship',			label: 'Ship', width: 100},
	{ name: 'system',		label: 'System', width: 80 },

	{ name: 'shipsSub',		label: 'Will fly', width: 100, disabled: 1 },
	{ name: 'shipsAll',		label: 'Can fly', width: 100, disabled: 1 },
	{ name: 'timeActive',	label: 'Time Active', width: 60, disabled: 1 },
	{ name: 'timeWaitlist', label: 'Time Waitlist', width: 60, disabled: 1 },

	{ name: 'timeTotal',	label: 'Time total', width: 60},
];

function setupFleetTable() {
	let fleetTable = createDiv(gMain, '', 'fleetTable');
	globalData.fleetTable = fleetTable;

	let colgroup = createDiv(fleetTable, '', 'fleetColGroup');

	let ths = createDiv(fleetTable, '', 'fleetHeadGroup');

	for (let col of colsStruct) {
		if (col.disabled) continue;

		let colDiv = createDiv(colgroup, '', 'fleetColumn');
		colDiv.style.width = col.width + 'px';

		let th = createDiv(ths, col.label, 'fleetHeader');
	}

	let body = createDiv(fleetTable, '', 'fleetBody');
	globalData.fleetBody = body;
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
	cell.addEventListener('click', callback);
	return cell;
}

function moveToSquad(event) {
	let squad_down = event.target;
	let pilotData = squad_down.pilotData;
	let targetSquad = squad_down.targetSquad;
	if (!targetSquad) return;

	squad_down.classList.remove(...squad_down.classList);
	squad_down.textContent = 'changing...';
	squad_down.targetSquad = null;

	the_webmethod_callback(pilotData, targetSquad);

	function the_webmethod_callback(pilotData, targetSquad) {
		pilotData.model.squad = targetSquad;
		updateRow(pilotData);
	};
};

function showBtnMenu(event) {
	let btnDiv = event.target;

	//btnDiv.menuDOM.style.display = 'block';
	//$(btnDiv.dropmenuDOM).dropdown();
}

function createDropDownMenu(parent, text, onClick, options, config) {
	if (!config) config = {};
	let dropmenu = createDiv(parent, '', 'dropdown');

	let btn = addButton(dropmenu, text, onClick, config.btnCss);
	btn.classList.add('dropdown-toggle');
	btn.setAttribute('data-toggle', "dropdown");

	let menu = createDiv(dropmenu, '', 'dropdown-menu');

	for (let op of options) {
		addButton(menu, op);
	}

	$(btn).dropdown();

	return dropmenu;
}

function setupPilotBtns(pilotData) {
	let btnsDiv = pilotData.cellsDOM['squadBtn'];

	let options = [];
	if (!pilotData.model.gMain) {
		options.push('Connect to main');
	}
	options.push('test');

	let dropmenu = createDropDownMenu(btnsDiv, '...', showBtnMenu, options, { btnCss: 'pilotBtns' });

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

	let row = createDiv(globalData.fleetBody, '', 'fleetRow');
	pilotData.rowDOM = row;

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

	updateRow(pilotData);
};


function updateRow(pilotData) {
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
						cells['squad_up'].classList.add('greenSquad');

						cells['squad_down'].textContent = globalData.waitlistSquad + ' <-';
						cells['squad_down'].targetSquad = globalData.waitlistSquad;
					} else {
						cells['squad_up'].classList.remove('greenSquad');
						cells['squad_up'].classList.add('orangeSquad');

						cells['squad_down'].textContent = '-> ' + globalData.currentSquad;
						cells['squad_down'].targetSquad = globalData.currentSquad;
					}
				}
			break;
			case 'squadBtn':
			break;
			case 'ship':
				cells['ship'].textContent = model.ship;
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
