/* eslint guard-for-in:0 */
var OWLHUB;

/**
 * A set of utility methods for use with the OWLHUB SDK.
 *
 * @!attribute abort
 *   Return this value from an iterator function {each} or {arrayEach}
 *   to break out of the iteration.
 *   @example Breaking out of an iterator function
 *     OWLHUB.util.each({a: 1, b: 2, c: 3}, function(key, value) {
 *       if (key == 'b') return OWLHUB.util.abort;
 *     });
 *    @see each
 *    @see arrayEach
 * @api private
 */

var util = {
  environment: 'nodejs',
  engine: function engine() {
    if (util.isBrowser() && typeof navigator !== 'undefined') {
      return navigator.userAgent
    } else {
      var engine = process.platform + '/' + process.version;
      if (process.env.AWS_EXECUTION_ENV) {
        engine += ' exec-env/' + process.env.AWS_EXECUTION_ENV;
      }

      return engine;
    }
  },
}

/**
 *
 */
module.exports = util;
