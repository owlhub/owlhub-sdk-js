/**
 * The main OWLHUB namespace
 */
var OWLHUB = { util: require('./util') };

/**
 * @api private
 * @!macro [new] nobrowser
 *   @note This feature is not supported in the browser environment of the SDK.
 */
var _hidden = {}; _hidden.toString(); // hack to parse macro

/**
 * @api private
 */
module.exports = OWLHUB;

OWLHUB.util.update(OWLHUB, {

  /**
   * @constant
   */
  VERSION: '0.0.1',

  /**
   * @api private
   */
  Signers: {},

  /**
   * @api private
   */
  apiLoader: require('./api_loader'),
})
