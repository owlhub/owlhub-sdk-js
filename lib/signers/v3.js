var OWLHUB = require('../core');
var inherit = OWLHUB.util.inherit;

/**
 * @api private
 */
OWLHUB.Signers.V3 = inherit(OWLHUB.Signers.RequestSigner, {
  addAuthorization: function addAuthorization(credentials, date) {

    var datetime = OWLHUB.util.date.rfc822(date);

    this.request.headers['X-Owlhub-Date'] = datetime;

    if (credentials.sessionToken) {
      this.request.headers['x-owlhub-security-token'] = credentials.sessionToken;
    }

    this.request.headers['X-Owlhub-Authorization'] =
      this.authorization(credentials, datetime);

  },

  authorization: function authorization(credentials) {
    return 'OWLHUB3 ' +
      'OWLHUBAccessKeyId=' + credentials.accessKeyId + ',' +
      'Algorithm=HmacSHA256,' +
      'SignedHeaders=' + this.signedHeaders() + ',' +
      'Signature=' + this.signature(credentials);
  },

  signedHeaders: function signedHeaders() {
    var headers = [];
    OWLHUB.util.arrayEach(this.headersToSign(), function iterator(h) {
      headers.push(h.toLowerCase());
    });
    return headers.sort().join(';');
  },

  canonicalHeaders: function canonicalHeaders() {
    var headers = this.request.headers;
    var parts = [];
    OWLHUB.util.arrayEach(this.headersToSign(), function iterator(h) {
      parts.push(h.toLowerCase().trim() + ':' + String(headers[h]).trim());
    });
    return parts.sort().join('\n') + '\n';
  },

  headersToSign: function headersToSign() {
    var headers = [];
    OWLHUB.util.each(this.request.headers, function iterator(k) {
      if (k === 'Host' || k === 'Content-Encoding' || k.match(/^X-Owlhub/i)) {
        headers.push(k);
      }
    });
    return headers;
  },

  signature: function signature(credentials) {
    return OWLHUB.util.crypto.hmac(credentials.secretAccessKey, this.stringToSign(), 'base64');
  },

  stringToSign: function stringToSign() {
    var parts = [];
    parts.push(this.request.method);
    parts.push('/');
    parts.push('');
    parts.push(this.canonicalHeaders());
    parts.push(this.request.body);
    return OWLHUB.util.crypto.sha256(parts.join('\n'));
  }

});

/**
 * @api private
 */
module.exports = OWLHUB.Signers.V3;
