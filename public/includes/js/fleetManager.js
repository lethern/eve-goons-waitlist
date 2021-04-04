
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

let globalData = {
	// currentSquad
	// waitlistSquad
};
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

let socket = io({ autoConnect: false });

socket.on("connect_error", (err) => {
	if (err.message === "invalid username") {
		alert('Connection error');
	}
});

socket.auth = { username: "Bob" };
socket.connect();

$(document).ready(() => {
	let main = document.getElementById('main');

	//
	socket.emit('listenForFleet', { fleetId: SERV_fleetId });

	socket.on('ACK', (fleetId) => {
		alert(fleetId);
	});

	socket.on('fleet_data', (args) => {
		let model = args.pilots;

		//let model = generateTestModel();
		let data = [];
		for (let entry in model) {
			let pilotData = {};
			pilotData.model = model[entry];

			addRow(pilotData);

			data.push(pilotData);
		}
	});
	//

	setupFleetTable();


	globalData.currentSquad = 'Fleet 1';
	globalData.waitlistSquad = 'Waitlist';

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
})

function setupFleetTable() {
	let fleetTable = document.createElement('div');
	fleetTable.classList.add('fleetTable');
	main.appendChild(fleetTable);
	globalData.fleetTable = fleetTable;

	let colgroup = document.createElement('div');
	colgroup.classList.add('fleetColGroup');

	let ths = document.createElement('div');
	ths.classList.add('fleetHeadGroup');


	let columns = ['Pilot', 'Squad', '', 'Ship', 'System', 'Will fly', 'Can fly', 'Time active', 'Time waitlist', 'Time total'];
	let widths = [200, 110, 50, 100, 80, 100, 100, 60, 60, 60];
	for (let i in columns) {
		let column = document.createElement('div');
		column.classList.add('fleetColumn');
		column.style.width = widths[i] + 'px';
		colgroup.appendChild(column);

		let th = document.createElement('div');
		th.classList.add('fleetHeader');
		th.textContent = columns[i];
		ths.appendChild(th);
	}

	fleetTable.appendChild(colgroup);
	fleetTable.appendChild(ths);


	let body = document.createElement('div');
	body.classList.add('fleetBody');
	fleetTable.appendChild(body);
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

function setupPilotBtns(pilotData) {
	let btnsDiv = pilotData.cellsDOM['squadBtn'];
	let dropmenu = document.createElement('div');
	dropmenu.classList.add('dropdown');
	btnsDiv.appendChild(dropmenu);


	let btn = addButton(dropmenu, '...', showBtnMenu, 'pilotBtns');
	btn.classList.add('dropdown-toggle');
	btn.pilotData = pilotData;
	btn.dropmenuDOM = dropmenu;
	btn.setAttribute('data-toggle', "dropdown");

	let menu = document.createElement('div');
	menu.classList.add('dropdown-menu');
	//menu.style.display = 'none';
	dropmenu.appendChild(menu);

	$(btn).dropdown();
	
	btn.menuDOM = menu;

	if (!pilotData.model.main) {
		addButton(menu, 'Connect to main');
	}
	//addButton(menu, '2');
	// 
}

function addRow(pilotData) {
	let model = pilotData.model;

	let row = document.createElement('div');
	row.classList.add('fleetRow');
	globalData.fleetBody.appendChild(row);
	pilotData.rowDOM = row;

	let cells = {};
	pilotData.cellsDOM = cells;

	cells['name'] =		addCell(row, '');
	cells['name_up'] = addCell(cells['name'], '');
	if (model.main) {
		cells['name_down'] = addCell(cells['name'], '', 'altNameImg');
		cells['name_down'] = addCell(cells['name'], '', 'altName');
	}

	cells['squad'] =	addCell(row, '');
	cells['squad_up'] = addCell(cells['squad'], '');
	cells['squad_down'] = addButton(cells['squad'], '', moveToSquad, 'blueSquad');
	cells['squad_down'].pilotData = pilotData;

	cells['squadBtn'] = addCell(row, '');

	cells['ship'] = addCell(row, '');
	cells['system'] = addCell(row, '');

	cells['shipsSub'] = addCell(row, '');
	cells['shipsAll'] =	addCell(row, '');
	cells['timeActive'] =	addCell(row, '');
	cells['timeWaitlist'] =	addCell(row, '');
	cells['timeTotal'] = addCell(row, '');
	
	setupPilotBtns(pilotData);

	if (!model.main) row.classList.add('rowMain')
	else row.classList.add('rowAlt');

	updateRow(pilotData);
};


function updateRow(pilotData) {
	let cells = pilotData.cellsDOM;
	let model = pilotData.model;
	cells['name_up'].textContent = model.name;
	if (model.main) {
		cells['name_down'].textContent = model.main;
	}
	cells['shipsSub'].textContent = model.shipsSub.join('\n');
	cells['shipsAll'].textContent = model.shipsAll.join('\n');
	cells['timeActive'].textContent = model.timeActive;
	cells['timeWaitlist'].textContent = model.timeWaitlist;
	cells['timeTotal'].textContent = model.timeTotal;
	cells['ship'].textContent = model.ship;
	cells['system'].textContent = model.system;

	cells['squad_up'].textContent = model.squad;

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
	
};