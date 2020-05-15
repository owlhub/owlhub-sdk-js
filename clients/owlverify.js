require('../lib/node_loader');
var OWLHUB = require('../lib/core');
var Service = OWLHUB.Service;
var apiLoader = OWLHUB.apiLoader;

apiLoader.services['owlverify'] = {};
OWLHUB.OwlVerify = Service.defineService('owlverify', ['2020-05-10']);
Object.defineProperty(apiLoader.services['owlverify'], '2020-05-10', {
  get: function get() {
  },
  enumerable: true,
  configurable: true,
});

module.exports = OWLHUB.OwlVerify;
