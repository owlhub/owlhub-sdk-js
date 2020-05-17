var OWLHUB = require('../core');
var inherit = OWLHUB.util.inherit;

require('./v3');

/**
 * @api private
 */
OWLHUB.Signers.V3Https = inherit(OWLHUB.Signers.V3, {
  authorization: function authorization(credentials) {
    return 'OWLHUB3-HTTPS ' +
      'OWLHUBAccessKeyId=' + credentials.accessKeyId + ',' +
      'Algorithm=HmacSHA256,' +
      'Signature=' + this.signature(credentials);
  },

  stringToSign: function stringToSign() {
    return this.request.headers['X-Owlhub-Date'];
  }
});

/**
 * @api private
 */
module.exports = OWLHUB.Signers.V3Https;
