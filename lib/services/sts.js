var OWLHUB = require('../core');
var resolveRegionalEndpointsFlag = require('../config_regional_endpoint');
var ENV_REGIONAL_ENDPOINT_ENABLED = 'OWLHUB_STS_REGIONAL_ENDPOINTS';
var CONFIG_REGIONAL_ENDPOINT_ENABLED = 'sts_regional_endpoints';

OWLHUB.util.update(OWLHUB.STS.prototype, {
  /**
   * @overload credentialsFrom(data, credentials = null)
   *   Creates a credentials object from STS response data containing
   *   credentials information. Useful for quickly setting OWLHUB credentials.
   *
   *   @note This is a low-level utility function. If you want to load temporary
   *     credentials into your process for subsequent requests to OWLHUB resources,
   *     you should use {OWLHUB.TemporaryCredentials} instead.
   *   @param data [map] data retrieved from a call to {getFederatedToken},
   *     {getSessionToken}, {assumeRole}, or {assumeRoleWithWebIdentity}.
   *   @param credentials [OWLHUB.Credentials] an optional credentials object to
   *     fill instead of creating a new object. Useful when modifying an
   *     existing credentials object from a refresh call.
   *   @return [OWLHUB.TemporaryCredentials] the set of temporary credentials
   *     loaded from a raw STS operation response.
   *   @example Using credentialsFrom to load global OWLHUB credentials
   *     var sts = new OWLHUB.STS();
   *     sts.getSessionToken(function (err, data) {
   *       if (err) console.log("Error getting credentials");
   *       else {
   *         OWLHUB.config.credentials = sts.credentialsFrom(data);
   *       }
   *     });
   *   @see OWLHUB.TemporaryCredentials
   */
  credentialsFrom: function credentialsFrom(data, credentials) {
    if (!data) return null;
    if (!credentials) credentials = new OWLHUB.TemporaryCredentials();
    credentials.expired = false;
    credentials.accessKeyId = data.Credentials.AccessKeyId;
    credentials.secretAccessKey = data.Credentials.SecretAccessKey;
    credentials.sessionToken = data.Credentials.SessionToken;
    credentials.expireTime = data.Credentials.Expiration;
    return credentials;
  },

  assumeRoleWithWebIdentity: function assumeRoleWithWebIdentity(params, callback) {
    return this.makeUnauthenticatedRequest('assumeRoleWithWebIdentity', params, callback);
  },

  /**
   * @api private
   */
  setupRequestListeners: function setupRequestListeners(request) {
    request.addListener('validate', this.optInRegionalEndpoint, true);
  },

  /**
   * @api private
   */
  optInRegionalEndpoint: function optInRegionalEndpoint(req) {
    var service = req.service;
    var config = service.config;
    config.stsRegionalEndpoints = resolveRegionalEndpointsFlag(service._originalConfig, {
      env: ENV_REGIONAL_ENDPOINT_ENABLED,
      sharedConfig: CONFIG_REGIONAL_ENDPOINT_ENABLED,
      clientConfig: 'stsRegionalEndpoints'
    });
    if (
      config.stsRegionalEndpoints === 'regional' &&
      service.isGlobalEndpoint
    ) {
      //client will throw if region is not supplied; request will be signed with specified region
      if (!config.region) {
        throw OWLHUB.util.error(new Error(),
          {code: 'ConfigError', message: 'Missing region in config'});
      }
      var insertPoint = config.endpoint.indexOf('.owlhub.io');
      var regionalEndpoint = config.endpoint.substring(0, insertPoint) +
        '.' + config.region + config.endpoint.substring(insertPoint);
      req.httpRequest.updateEndpoint(regionalEndpoint);
      req.httpRequest.region = config.region;
    }
  }

});
