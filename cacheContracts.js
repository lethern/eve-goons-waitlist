const esi = require('./swagger.js');
const db = require('./dbHandler.js').db.collection('cacheContracts');
const dbItems = require('./dbHandler.js').db.collection('cacheItems');
const log = require('./logger.js')(module);

const ESI2 = require('eve_swagger_interface');
const ESI2_defaultClient = ESI2.ApiClient.instance;
const ContractsApi = new ESI2.ContractsApi();
const UniverseApi = new ESI2.UniverseApi();

function diffArray(arr1, arr2) {
	let a = new Set(arr1);
	let b = new Set(arr2);
	return [... new Set([...a].filter(x => !b.has(x)))];
}


function uniq(list) {
	return [...new Set(list)];
	//return list.reduce((acc, d) => acc.includes(d) ? acc : acc.concat(d), []);
}


module.exports = function (setup) {
	
	module.getContracts = function (corporationId, contractIds, cb) {

		db.find({ 'id': { $in: contractIds } }).toArray(function (err, cachedContracts) {
			if (err) {
				log.error("getContracts: Error for db.find", { err });
				cb(err);
				return;
			}

			var cachedIds = cachedContracts.map(d => d.id);
			var lackingContractRecords = diffArray(contractIds, cachedIds);

			console.log('getContracts cachedContracts ' + cachedContracts.length + ', lackingContractRecords (capped) ' + lackingContractRecords.length);

			if (lackingContractRecords.length == 0) {
				cb(null, cachedContracts);
				return;
			}

			if (lackingContractRecords.length > 60) {
				lackingContractRecords = lackingContractRecords.slice(0, 60);
			}

			let count = lackingContractRecords.length;
			let done = 0;
			let lastInvoked = 0;
			let error_called = false;
			let contractRecords = [];


			runLoop();

			//let contract_id = lackingContractRecords[lastInvoked];
			//ContractsApi.getCorporationsCorporationIdContractsContractIdItems(contract_id, corporationId, {}, function (error, data) {
			//	callback(error, data, contract_id);
			//});

			function callback(error, data, contract_id) {
				if (error_called) return;

				if (error) {
					log.error("getContracts: Error for getCorporationsCorporationIdContractsContractIdItems", { error, contract_id });
					error_called = true;
					cb(error);
					return;
				} else {
					contractRecords.push({ contract_id, data });
				}

				
				done++;
				if (done == count) {
					_continue();
					return;
				}

				// if there was no error, we run a loop
				if (done % 20 == 0) {
					runLoop();
				}
			};
			
			function runLoop() {
				setTimeout(function () {
					console.log('getting ' + lastInvoked + '...' + (lastInvoked+20)+'/'+count);
					for (let i = 0; i < 20; ++i) {
					
						if (lastInvoked >= count) {
							console.log('done ' + lastInvoked);
							return;
						}

						let contract_id = lackingContractRecords[lastInvoked];
						++lastInvoked;

						ContractsApi.getCorporationsCorporationIdContractsContractIdItems(contract_id, corporationId, {}, function (error, data) {
							callback(error, data, contract_id);
						});
					}
				}, 10*1000+100);
			};
			

			function _continue() {
				console.log('getContracts continue ' + contractRecords.length);

				//console.log('', JSON.stringify(contractRecords));

				module.getContracts_items(contractRecords, cachedContracts, cb)
			}
		});
	}


	module.getContracts_items = function (contractRecords, cachedContracts, cb) {
		let all_item_ids = [];

		contractRecords.forEach(contract => {
			// {"isIncluded":true,"isSingleton":false,"quantity":1,"recordId":3472254895,"typeId":12102},
			let item_types = contract.data.map(record => record.typeId);
			all_item_ids = all_item_ids.concat(item_types);
		});

		all_item_ids = uniq(all_item_ids);

		module.getItemNames(all_item_ids, function (err, items) {
			if (err) {
				cb(err);
				return;
			}

			console.log('getItemNames done', items.length);

			let itemNames = {};
			items.forEach(item => {
				itemNames[item.id] = item.name;
			});

			let contracts_ships = [];

			contractRecords.forEach(contract => {
				let contract_id = contract.contract_id;

				let ships = [];
				contract.data.forEach(record => {
					let name = itemNames[record.typeId];

					if (['Basilisk', 'Gila', 'Nighthawk', 'Praxis', 'Huginn'].includes(name)) {
						ships.push(name);
					}
				});

				contracts_ships.push({ id: contract_id, ships });
			});

			console.log('saving contracts_ships', contracts_ships.length);

			db.insertMany(contracts_ships, function (err, result) {
				if (err) {
					log.error("getContracts_items insertMany: Error ", { err });
					cb(err);
					return;
				}

				let all_ships = cachedContracts.concat(contracts_ships);
				cb(null, all_ships);
			});
		});
	};

	module.getItemNames = function (item_ids, cb) {

		dbItems.find({ 'id': { $in: item_ids } }).toArray(function (err, docs) {
			if (err) {
				log.error("getContracts_items: Error for dbItems.find", { err });
				cb(err);
				return;
			}

			var fullquery = docs.map(d => d.id);
			var newBulkSearch = diffArray(item_ids, fullquery);

			console.log('getContracts_items docs ' + docs.length + ', newBulkSearch (capped) ' + newBulkSearch.length);

			if (newBulkSearch.length == 0) {
				cb(null, docs);
				return;
			}


			try {
				UniverseApi.postUniverseNames(newBulkSearch, {}, callback);
			} catch (e) {
				console.error('postUniverseNames', e);
				cb(e);
			}
			
			function callback(error, data, response) {
				if (error) {
					console.error('getItemNames', error);
					cb(error);
					return;
				}

				//console.log('API called successfully. Returned data: ' + JSON.stringify(data));

				dbItems.insertMany(data, function (err, result) {
					if (err) {
						log.error("insertMany: Error for db.insertMany", { err });
						cb(err);
						return;
					}

					console.log('saved ');
					/*
					 "category": "inventory_type",
					"id": 17715,
					"name": "Gila"
					*/

					let all_data = docs.concat(data);
					cb(null, all_data);
				});

			};

		});

	};


	return module;
}