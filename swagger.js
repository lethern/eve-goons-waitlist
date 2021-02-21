
const esi = require('eve-swagger');

let esi_obj = esi.makeAPI({
	service: 'https://esi.evetech.net',
	source: 'tranquility',
	agent: 'eve-swagger | https://github.com/lhkbob/eve-swagger-js',
	language: 'en-us',
	timeout: 6000,
	minTime: 0,
	maxConcurrent: 0
});

module.exports = esi_obj;