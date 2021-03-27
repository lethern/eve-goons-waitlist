
let fleetTable;

$(document).ready(() => {
	let main = document.getElementById('main');
	fleetTable = document.createElement('div');
	fleetTable.classList.add('fleetTable');
	main.appendChild(fleetTable);

	addRow(1)
})

function addRow(text) {
	let row = document.createElement('div');
	row.classList.add('fleetRow');
	fleetTable.appendChild(row);

	let cell = document.createElement('div');
	cell.classList.add('fleetCell');
	row.appendChild(cell);

	cell.textContent = text;
}