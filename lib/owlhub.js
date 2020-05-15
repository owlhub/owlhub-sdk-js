require('./node_loader');

var OWLHUB = require('./core');

// Load all service classes
require('../clients/all');

/**
 * @api private
 */
module.exports = OWLHUB;
