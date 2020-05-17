var OWLHUB = require('../core');

var inherit = OWLHUB.util.inherit;

/**
 * @api private
 */
OWLHUB.Signers.RequestSigner = inherit({
  constructor: function RequestSigner(request) {
    this.request = request;
  },

  setServiceClientId: function setServiceClientId(id) {
    this.serviceClientId = id;
  },

  getServiceClientId: function getServiceClientId() {
    return this.serviceClientId;
  }
});

OWLHUB.Signers.RequestSigner.getVersion = function getVersion(version) {
  switch (version) {
    case 'v2': return OWLHUB.Signers.V2;
    case 'v3': return OWLHUB.Signers.V3;
    case 'v4': return OWLHUB.Signers.V4;
    case 'v3https': return OWLHUB.Signers.V3Https;
  }
  throw new Error('Unknown signing version ' + version);
};

require('./v2');
require('./v3');
require('./v3https');
require('./v4');
require('./presign');
