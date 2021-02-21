const esi = require('./swagger.js');
const db = require('./dbHandler.js').db.collection('cache');
const log = require('./logger.js')(module);

module.exports = function (setup) {
	var module = {};
	var cachetemp = [];

	module.query = function (id, cb) {
		if (typeof id === "number" || typeof id === "string") {
			id = Array.of(id);
		}
		esi.names(id).then(function (item) {
			cb(item[0]);
			module.removeFromCacheTemp(id);
		}).catch(err => {
			log.error("cache.query: Error for esi.names", { err, id });
		});
	}

	module.removeFromCacheTemp = function (id) {
		if (cachetemp.indexOf(id) > -1) {
			cachetemp.splice(cachetemp.indexOf(id), 1);
		}
	}

	module.addToDb = function (data, expiresIn, cb) {
		var doc = {
			id: data.id
		}

		if(!!expiresIn) {
			Object.assign(data, {
				expires: epoch() + expiresIn
			});
		}

		db.update(doc, data, { upsert: true }, function (err, result) {
			if (err) {
				log.error("addToDb: Error for db.update", { err, id: data.id });
				// TODO: should this continue?
			}
			if (typeof cb === "function") cb();
		})
	}
	//Duplicate key errors are caused by trying to 'get' stuff too quickly. NEED to make getting a background process
	module.get = function (id, expiresIn, cb) {
		db.findOne({ 'id': id }, function (err, doc) {
			if (err) log.error("get: Error for db.findOne", { err, id });
			if (doc === null) {
				fetch(id, expiresIn, cb);
			} else {
				// Check to see if document has expired
				if(!!doc.expires && !!expiresIn && doc.expires < epoch()) {
					fetch(id, expiresIn, cb);
				} else {
					// if we didn't need to expire or didn't expire, lets just 
					// return the doc as is
					cb(doc)
					module.removeFromCacheTemp(id);
				}
			}
		});

	}

	function fetch(id, expiresIn, cb) {
		if (!cachetemp.includes(id)) {
			cachetemp.push(id);
			module.query(id, function (item) {
				module.addToDb(item, expiresIn);
				cb(item);
				module.removeFromCacheTemp(id);
			})
		} else {
			cb(id);
		}
	}

	function epoch() {
		return Math.round((new Date()).getTime() / 1000);
	}

	function uniq(list) {
		return list.reduce((acc, d) => acc.includes(d) ? acc : acc.concat(d), []);
	}

	function diffArray(arr1, arr2) {
		var newArr = [];
		var myArr = arr1.concat(arr2);
		var count = 0;
		for (i = 0; i < myArr.length; i++) {
			for (j = 0; j < myArr.length; j++) {
				if (myArr[j] == myArr[i]) {
					count++;
				}
			}
			if (count == 1) {
				newArr.push(myArr[i]);
			}
			count = 0;
		}
		return newArr;
	}


	module.massQuery = function (ids, cb) {
		ids = uniq(ids);
		newids = [];
		for (var i = 0; i < ids.length; i++) {
			if (!cachetemp.includes(ids[i])) {
				newids.push(ids[i]);
				cachetemp.push(ids[i]);
			}
		}
		ids = newids;
		db.find({ 'id': { $in: ids } }).toArray(function (err, docs) {
			if (err) log.error("massQuery: Error for db.find", { err, ids });
			var fullquery = [];
			for (var i = 0; i < docs.length; i++) {
				fullquery.push(docs[i].id);
			}
			var newBulkSearch = uniq(diffArray(fullquery, uniq(ids)));
			if (newBulkSearch.length == 0) return;

			esi.names(newBulkSearch).then(function (items) {
				db.insertMany(items, function (err, result) {
					if (err) log.error("cache.massQuery: Error for db.insertMany", { err, items });
					if (typeof cb === "function") {
						cb(items);
					}
					for (var i = 0; i < items.length; i++) {
						module.removeFromCacheTemp(items[i].id);
					}
				});
			}).catch(err => {
				log.error("cache.query: Error for esi.names", { err, newBulkSearch });
			});
		});
	}

	return module;
}