var OWLHUB = require('../core');
var STS = require('../../clients/sts');

/**
 * Represents temporary credentials retrieved from {OWLHUB.STS}. Without any
 * extra parameters, credentials will be fetched from the
 * {OWLHUB.STS.getSessionToken} operation. If an IAM role is provided, the
 * {OWLHUB.STS.assumeRole} operation will be used to fetch credentials for the
 * role instead.
 *
 * OWLHUB.ChainableTemporaryCredentials differs from OWLHUB.TemporaryCredentials in
 * the way masterCredentials and refreshes are handled.
 * OWLHUB.ChainableTemporaryCredentials refreshes expired credentials using the
 * masterCredentials passed by the user to support chaining of STS credentials.
 * However, OWLHUB.TemporaryCredentials recursively collapses the masterCredentials
 * during instantiation, precluding the ability to refresh credentials which
 * require intermediate, temporary credentials.
 *
 * For example, if the application should use RoleA, which must be assumed from
 * RoleB, and the environment provides credentials which can assume RoleB, then
 * OWLHUB.ChainableTemporaryCredentials must be used to support refreshing the
 * temporary credentials for RoleA:
 *
 * ```javascript
 * var roleACreds = new OWLHUB.ChainableTemporaryCredentials({
 *   params: {RoleOrn: 'RoleA'},
 *   masterCredentials: new OWLHUB.ChainableTemporaryCredentials({
 *     params: {RoleOrn: 'RoleB'},
 *     masterCredentials: new OWLHUB.EnvironmentCredentials('OWLHUB')
 *   })
 * });
 * ```
 *
 * If OWLHUB.TemporaryCredentials had been used in the previous example,
 * `roleACreds` would fail to refresh because `roleACreds` would
 * use the environment credentials for the AssumeRole request.
 *
 * Another difference is that OWLHUB.ChainableTemporaryCredentials creates the STS
 * service instance during instantiation while OWLHUB.TemporaryCredentials creates
 * the STS service instance during the first refresh. Creating the service
 * instance during instantiation effectively captures the master credentials
 * from the global config, so that subsequent changes to the global config do
 * not affect the master credentials used to refresh the temporary credentials.
 *
 * This allows an instance of OWLHUB.ChainableTemporaryCredentials to be assigned
 * to OWLHUB.config.credentials:
 *
 * ```javascript
 * var envCreds = new OWLHUB.EnvironmentCredentials('OWLHUB');
 * OWLHUB.config.credentials = envCreds;
 * // masterCredentials will be envCreds
 * OWLHUB.config.credentials = new OWLHUB.ChainableTemporaryCredentials({
 *   params: {RoleOrn: '...'}
 * });
 * ```
 *
 * Similarly, to use the CredentialProviderChain's default providers as the
 * master credentials, simply create a new instance of
 * OWLHUB.ChainableTemporaryCredentials:
 *
 * ```javascript
 * OWLHUB.config.credentials = new ChainableTemporaryCredentials({
 *   params: {RoleOrn: '...'}
 * });
 * ```
 *
 * @!attribute service
 *   @return [OWLHUB.STS] the STS service instance used to
 *     get and refresh temporary credentials from OWLHUB STS.
 * @note (see constructor)
 */
OWLHUB.ChainableTemporaryCredentials = OWLHUB.util.inherit(OWLHUB.Credentials, {
  /**
   * Creates a new temporary credentials object.
   *
   * @param options [map] a set of options
   * @option options params [map] ({}) a map of options that are passed to the
   *   {OWLHUB.STS.assumeRole} or {OWLHUB.STS.getSessionToken} operations.
   *   If a `RoleOrn` parameter is passed in, credentials will be based on the
   *   IAM role. If a `SerialNumber` parameter is passed in, {tokenCodeFn} must
   *   also be passed in or an error will be thrown.
   * @option options masterCredentials [OWLHUB.Credentials] the master credentials
   *   used to get and refresh temporary credentials from OWLHUB STS. By default,
   *   OWLHUB.config.credentials or OWLHUB.config.credentialProvider will be used.
   * @option options tokenCodeFn [Function] (null) Function to provide
   *   `TokenCode`, if `SerialNumber` is provided for profile in {params}. Function
   *   is called with value of `SerialNumber` and `callback`, and should provide
   *   the `TokenCode` or an error to the callback in the format
   *   `callback(err, token)`.
   * @example Creating a new credentials object for generic temporary credentials
   *   OWLHUB.config.credentials = new OWLHUB.ChainableTemporaryCredentials();
   * @example Creating a new credentials object for an IAM role
   *   OWLHUB.config.credentials = new OWLHUB.ChainableTemporaryCredentials({
   *     params: {
   *       RoleOrn: 'orn:owlhub:iam::1234567890:role/TemporaryCredentials'
   *     }
   *   });
   * @see OWLHUB.STS.assumeRole
   * @see OWLHUB.STS.getSessionToken
   */
  constructor: function ChainableTemporaryCredentials(options) {
    OWLHUB.Credentials.call(this);
    options = options || {};
    this.errorCode = 'ChainableTemporaryCredentialsProviderFailure';
    this.expired = true;
    this.tokenCodeFn = null;

    var params = OWLHUB.util.copy(options.params) || {};
    if (params.RoleOrn) {
      params.RoleSessionName = params.RoleSessionName || 'temporary-credentials';
    }
    if (params.SerialNumber) {
      if (!options.tokenCodeFn || (typeof options.tokenCodeFn !== 'function')) {
        throw new OWLHUB.util.error(
          new Error('tokenCodeFn must be a function when params.SerialNumber is given'),
          {code: this.errorCode}
        );
      } else {
        this.tokenCodeFn = options.tokenCodeFn;
      }
    }
    var config = OWLHUB.util.merge(
      {
        params: params,
        credentials: options.masterCredentials || OWLHUB.config.credentials
      },
      options.stsConfig || {}
    );
    this.service = new STS(config);
  },

  /**
   * Refreshes credentials using {OWLHUB.STS.assumeRole} or
   * {OWLHUB.STS.getSessionToken}, depending on whether an IAM role ORN was passed
   * to the credentials {constructor}.
   *
   * @callback callback function(err)
   *   Called when the STS service responds (or fails). When
   *   this callback is called with no error, it means that the credentials
   *   information has been loaded into the object (as the `accessKeyId`,
   *   `secretAccessKey`, and `sessionToken` properties).
   *   @param err [Error] if an error occurred, this value will be filled
   * @see OWLHUB.Credentials.get
   */
  refresh: function refresh(callback) {
    this.coalesceRefresh(callback || OWLHUB.util.fn.callback);
  },

  /**
   * @api private
   * @param callback
   */
  load: function load(callback) {
    var self = this;
    var operation = self.service.config.params.RoleOrn ? 'assumeRole' : 'getSessionToken';
    this.getTokenCode(function (err, tokenCode) {
      var params = {};
      if (err) {
        callback(err);
        return;
      }
      if (tokenCode) {
        params.TokenCode = tokenCode;
      }
      self.service[operation](params, function (err, data) {
        if (!err) {
          self.service.credentialsFrom(data, self);
        }
        callback(err);
      });
    });
  },

  /**
   * @api private
   */
  getTokenCode: function getTokenCode(callback) {
    var self = this;
    if (this.tokenCodeFn) {
      this.tokenCodeFn(this.service.config.params.SerialNumber, function (err, token) {
        if (err) {
          var message = err;
          if (err instanceof Error) {
            message = err.message;
          }
          callback(
            OWLHUB.util.error(
              new Error('Error fetching MFA token: ' + message),
              { code: self.errorCode}
            )
          );
          return;
        }
        callback(null, token);
      });
    } else {
      callback(null);
    }
  }
});
