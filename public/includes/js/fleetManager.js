function generateTestModel() {
	return [{
		name: 'lethern Zell',
		main: null,
		squad: 'Fleet 1',
		shipsSub: ['basi', 'huginn', 'gila'],
		shipsAll: ['gnosis', 'praxi'],
		timeActive: '1:30',
		timeWaitlist: '-',
		timeTotal: '1:38'
	},{
		name: 'saelen saal',
		main: 'lethern Zell',
		squad: 'Waitlist',
		shipsSub: ['gila'],
		shipsAll: ['gnosis', 'praxi'],
		timeActive: '0:15',
		timeWaitlist: '0:30',
		timeTotal: '1:38'
	},{
		name: 'Johny Bravo',
		main: null,
		squad: 'Waitlist',
		shipsSub: ['gila'],
		shipsAll: [],
		timeActive: '-',
		timeWaitlist: '0:10',
		timeTotal: '0:10'
	},{
		name: 'Bob bobman',
		main: null,
		squad: 'Waitlist',
		shipsSub: ['gila', 'praxi'],
		shipsAll: [],
		timeActive: '-',
		timeWaitlist: '0:17',
		timeTotal: '0:17'
	},{
		name: 'Alice bobman',
		main: 'Bob bobman',
		squad: 'Waitlist',
		shipsSub: ['gila', 'praxi'],
		shipsAll: [],
		timeActive: '-',
		timeWaitlist: '0:17',
		timeTotal: '0:17'
	},{
		name: 'Denise bobman',
		main: 'Bob bobman',
		squad: 'Waitlist',
		shipsSub: ['praxi'],
		shipsAll: [],
		timeActive: '-',
		timeWaitlist: '0:17',
		timeTotal: '0:17'
	}
		];
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
	}
	rowDOM
	cellsDOM
}
 */

$(document).ready(() => {
	let main = document.getElementById('main');

	setupFleetTable();
	
	globalData.currentSquad= 'Fleet 1';
	globalData.waitlistSquad= 'Waitlist';

	let model = generateTestModel();
	let data = [];
	for (let entry in model) {
		let pilotData = {};
		pilotData.model = model[entry];

		addRow(pilotData);

		data.push(pilotData);
	}
	
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


	let columns = ['Pilot', 'Squad', '', 'Will fly', 'Can fly', 'Time active', 'Time waitlist', 'Time total'];
	let widths = [250, 150, 50, 120, 120, 60, 60, 60];
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
	//alert('moving to ' + targetSquad);

	squad_down.textContent = 'changing...';
	squad_down.targetSquad = null;

	the_webmethod_callback(pilotData, targetSquad);

	function the_webmethod_callback(pilotData, targetSquad) {
		pilotData.model.squad = targetSquad;
		updateRow(pilotData);
	};
};

function addRow(pilotData) {
	let model = pilotData.model;

	let row = document.createElement('div');
	row.classList.add('fleetRow');
	globalData.fleetBody.appendChild(row);
	pilotData.rowDOM = row;

	let cells = {};
	pilotData.cellsDOM = cells;

	cells['name'] =		addCell(row, model.name);
	cells['squad'] = addCell(row, '');//model.squad);
	cells['squadBtn'] = addCell(row, '');
	cells['shipsSub'] = addCell(row, model.shipsSub.join('\n'));
	cells['shipsAll'] =	addCell(row, model.shipsAll.join('\n'));
	cells['timeActive'] =	addCell(row, model.timeActive);
	cells['timeWaitlist'] =	addCell(row, model.timeWaitlist);
	cells['timeTotal'] =	addCell(row, model.timeTotal);

	//, 
	//, 'orangeSquad'
	cells['squad_up'] = addCell(cells['squad'], model.squad);
	if (globalData.currentSquad && globalData.currentSquad == model.squad) {
		cells['squad_up'].classList.add('greenSquad');
		cells['squad_down'] = addButton(cells['squad'], globalData.waitlistSquad + ' <-', moveToSquad, 'blueSquad');
		cells['squad_down'].targetSquad = globalData.waitlistSquad;
	} else {
		cells['squad_up'].classList.add('orangeSquad');
		cells['squad_down'] = addButton(cells['squad'], '-> ' + globalData.currentSquad, moveToSquad, 'blueSquad');
		cells['squad_down'].targetSquad = globalData.currentSquad;
	}
	cells['squad_down'].pilotData = pilotData;

	if (!model.main) row.classList.add('rowMain')
	else row.classList.add('rowAlt');
};


function updateRow(pilotData) {
	let cells = pilotData.cellsDOM;
	let model = pilotData.model;
	cells['name'].textContent = model.name;
	cells['shipsSub'].textContent = model.shipsSub.join('\n');
	cells['shipsAll'].textContent = model.shipsAll.join('\n');
	cells['timeActive'].textContent = model.timeActive;
	cells['timeWaitlist'].textContent = model.timeWaitlist;
	cells['timeTotal'].textContent = model.timeTotal;

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