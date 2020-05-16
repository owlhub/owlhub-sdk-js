require('../lib/node_loader');
var OWLHUB = require('../lib/core');
var Service = OWLHUB.Service;
var apiLoader = OWLHUB.apiLoader;

apiLoader.services['sts'] = {};
OWLHUB.STS = Service.defineService('sts', ['2020-05-10']);
require('../lib/services/sts');
Object.defineProperty(apiLoader.services['sts'], '2020-05-10', {
  get: function get() {
    var model = require('../apis/sts-2020-05-10.min.json');
    model.paginators = require('../apis/sts-2020-05-10.paginators.json').pagination;
    return model;
  },
  enumerable: true,
  configurable: true
});

module.exports = OWLHUB.STS;
