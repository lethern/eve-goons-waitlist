const esi = require('./swagger.js');
const db = require('./dbHandler.js').db.collection('cacheContracts');
const log = require('./logger.js')(module);

const ESI2 = require('eve_swagger_interface');
const ESI2_defaultClient = ESI2.ApiClient.instance;
const ContractsApi = new ESI2.ContractsApi();


function diffArray(arr1, arr2) {
	let a = new Set(arr1);
	let b = new Set(arr2);
	return [... new Set([...a].filter(x => !b.has(x)))];
}

module.exports = function (setup) {


	module.getContracts = function (corporationId, ids, cb, accessToken) {
		//ids = uniq(ids);

		db.find({ 'id': { $in: ids } }).toArray(function (err, docs) {
			if (err) {
				log.error("getContracts: Error for db.find", { err, ids });
				cb(err);
				return;
			}

			var fullquery = docs.map(d => d.id);
			var newBulkSearch = diffArray(ids, fullquery);

			console.log('getContracts docs ' + docs.length + ', newBulkSearch (max 50) ' + newBulkSearch.length);

			if (newBulkSearch.length == 0) {
				cb(null, docs);
				return;
			}

			if (newBulkSearch.length > 50) {
				newBulkSearch = newBulkSearch.slice(0, 50);
			}

			let count = newBulkSearch.length;
			let done = 0;
			let error_called = false;
			let dataArr = [];

			if (accessToken) {
				var evesso = ESI2_defaultClient.authentications['evesso'];
				evesso.accessToken = accessToken;
			}

			let contract_id = newBulkSearch[0];
			ContractsApi.getCorporationsCorporationIdContractsContractIdItems(contract_id, corporationId, {}, callback);

			var callback = function (error, data, response) {

				if (error) {
					if (error_called) return;
					log.error("getContracts: Error for getCorporationsCorporationIdContractsContractIdItems", { error });
					cb(error);
					error_called = true;
					return;
				}

				dataArr.push(data);

				done++;
				if (done == count) {
					_continue();
					return;
				}

				// if there was no error, we run a loop
				if (done == 1) {
					console.log("received 1, running loop")
					runLoop();
				}
			};
			
			function runLoop() {
				for (let i = 1; i < count; ++i) {
					let contract_id = newBulkSearch[i];

					ContractsApi.getCorporationsCorporationIdContractsContractIdItems(contract_id, corporationId, {}, callback);
				}
			};
			

			function _continue() {
				console.log('getContracts continue ' + dataArr.length);

				db.insertMany(dataArr, function (err, result) {
					if (err) {
						log.error("getContracts: Error for db.insertMany", { err });
						cb(err);
						return;
					}

					var all = docs.concat(dataArr);

					cb(all);
				});
			}

			
			/*
			esi.names(newBulkSearch).then(function (items) {
				console.log('getContracts items ' + items.length);

				db.insertMany(items, function (err, result) {
					if (err) log.error("getContracts: Error for db.insertMany", { err, items });

					var all = docs.concat(items);

					cb(all);
				});
			}).catch(err => {
				log.error("getContracts: Error for esi.names", { err, newBulkSearch });
			});
			*/
		});
	}

	return module;
}