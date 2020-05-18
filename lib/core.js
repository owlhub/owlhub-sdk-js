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
  VERSION: '0.0.2',

  /**
   * @api private
   */
  Signers: {},

  /**
   * @api private
   */
  Protocol: {
    Json: require('./protocol/json'),
    Query: require('./protocol/query'),
    Rest: require('./protocol/rest'),
    RestJson: require('./protocol/rest_json'),
    RestXml: require('./protocol/rest_xml')
  },

  /**
   * @api private
   */
  XML: {
    Builder: require('./xml/builder'),
    Parser: null // conditionally set based on environment
  },

  /**
   * @api private
   */
  JSON: {
    Builder: require('./json/builder'),
    Parser: require('./json/parser')
  },

  /**
   * @api private
   */
  Model: {
    Api: require('./model/api'),
    Operation: require('./model/operation'),
    Shape: require('./model/shape'),
    Paginator: require('./model/paginator'),
    ResourceWaiter: require('./model/resource_waiter')
  },

  /**
   * @api private
   */
  apiLoader: require('./api_loader'),

  /**
   * @api private
   */
  EndpointCache: require('../vendor/endpoint-cache').EndpointCache
});
require('./sequential_executor');
require('./service');
require('./config');
require('./http');
require('./event_listeners');
require('./request');
require('./response');
require('./resource_waiter');
require('./signers/request_signer');
require('./param_validator');

/**
 * @readonly
 * @return [OWLHUB.SequentialExecutor] a collection of global event listeners that
 *   are attached to every sent request.
 * @see OWLHUB.Request OWLHUB.Request for a list of events to listen for
 * @example Logging the time taken to send a request
 *   OWLHUB.events.on('send', function startSend(resp) {
 *     resp.startTime = new Date().getTime();
 *   }).on('complete', function calculateTime(resp) {
 *     var time = (new Date().getTime() - resp.startTime) / 1000;
 *     console.log('Request took ' + time + ' seconds');
 *   });
 *
 *   new OWLHUB.S3().listBuckets(); // prints 'Request took 0.285 seconds'
 */
OWLHUB.events = new OWLHUB.SequentialExecutor();

//create endpoint cache lazily
OWLHUB.util.memoizedProperty(OWLHUB, 'endpointCache', function() {
  return new OWLHUB.EndpointCache(OWLHUB.config.endpointCacheSize);
}, true);
