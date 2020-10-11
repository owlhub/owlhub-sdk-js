require('aws-sdk/lib/node_loader');
var OWLHUB = require('aws-sdk/lib/core');
var Service = OWLHUB.Service;
var apiLoader = OWLHUB.apiLoader;

apiLoader.services['owlverify'] = {};
OWLHUB.OwlVerify = Service.defineService('owlverify', ['2020-05-10']);
Object.defineProperty(apiLoader.services['owlverify'], '2020-05-10', {
  get: function get() {
    var model = require('../apis/owlverify-2020-05-10.min.json');
    model.paginators = require('../apis/owlverify-2020-05-10.paginators.json').pagination;
    return model;
  },
  enumerable: true,
  configurable: true,
});

module.exports = OWLHUB.OwlVerify;
