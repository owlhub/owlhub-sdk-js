var fs = require('fs')

const regionConfigRules = require('aws-sdk/lib/region_config_data.json')

if (!('*/owlverify' in regionConfigRules.rules)) {
  regionConfigRules.rules['*/owlverify'] = {
    'endpoint': '{service}.{region}.owlhub.io'
  }

  fs.writeFileSync(require.resolve('aws-sdk/lib/region_config_data.json'), JSON.stringify(regionConfigRules))
}

require('aws-sdk/lib/node_loader')

var OWLHUB = require('aws-sdk/lib/core')

// Load all service classes
require('./clients/all')

/**
 * @api private
 */
module.exports = OWLHUB
