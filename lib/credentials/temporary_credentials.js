var OWLHUB = require('../core');
var STS = require('../../clients/sts');

/**
 * Represents temporary credentials retrieved from {OWLHUB.STS}. Without any
 * extra parameters, credentials will be fetched from the
 * {OWLHUB.STS.getSessionToken} operation. If an IAM role is provided, the
 * {OWLHUB.STS.assumeRole} operation will be used to fetch credentials for the
 * role instead.
 *
 * @note OWLHUB.TemporaryCredentials is deprecated, but remains available for
 *   backwards compatibility. {OWLHUB.ChainableTemporaryCredentials} is the
 *   preferred class for temporary credentials.
 *
 * To setup temporary credentials, configure a set of master credentials
 * using the standard credentials providers (environment, EC2 instance metadata,
 * or from the filesystem), then set the global credentials to a new
 * temporary credentials object:
 *
 * ```javascript
 * // Note that environment credentials are loaded by default,
 * // the following line is shown for clarity:
 * OWLHUB.config.credentials = new OWLHUB.EnvironmentCredentials('OWLHUB');
 *
 * // Now set temporary credentials seeded from the master credentials
 * OWLHUB.config.credentials = new OWLHUB.TemporaryCredentials();
 *
 * // subsequent requests will now use temporary credentials from OWLHUB STS.
 * new OWLHUB.S3().listBucket(function(err, data) { ... });
 * ```
 *
 * @!attribute masterCredentials
 *   @return [OWLHUB.Credentials] the master (non-temporary) credentials used to
 *     get and refresh temporary credentials from OWLHUB STS.
 * @note (see constructor)
 */
OWLHUB.TemporaryCredentials = OWLHUB.util.inherit(OWLHUB.Credentials, {
  /**
   * Creates a new temporary credentials object.
   *
   * @note In order to create temporary credentials, you first need to have
   *   "master" credentials configured in {OWLHUB.Config.credentials}. These
   *   master credentials are necessary to retrieve the temporary credentials,
   *   as well as refresh the credentials when they expire.
   * @param params [map] a map of options that are passed to the
   *   {OWLHUB.STS.assumeRole} or {OWLHUB.STS.getSessionToken} operations.
   *   If a `RoleOrn` parameter is passed in, credentials will be based on the
   *   IAM role.
   * @param masterCredentials [OWLHUB.Credentials] the master (non-temporary) credentials
   *  used to get and refresh temporary credentials from OWLHUB STS.
   * @example Creating a new credentials object for generic temporary credentials
   *   OWLHUB.config.credentials = new OWLHUB.TemporaryCredentials();
   * @example Creating a new credentials object for an IAM role
   *   OWLHUB.config.credentials = new OWLHUB.TemporaryCredentials({
   *     RoleOrn: 'orn:owlhub:iam::1234567890:role/TemporaryCredentials',
   *   });
   * @see OWLHUB.STS.assumeRole
   * @see OWLHUB.STS.getSessionToken
   */
  constructor: function TemporaryCredentials(params, masterCredentials) {
    OWLHUB.Credentials.call(this);
    this.loadMasterCredentials(masterCredentials);
    this.expired = true;

    this.params = params || {};
    if (this.params.RoleOrn) {
      this.params.RoleSessionName =
        this.params.RoleSessionName || 'temporary-credentials';
    }
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
   * @see get
   */
  refresh: function refresh (callback) {
    this.coalesceRefresh(callback || OWLHUB.util.fn.callback);
  },

  /**
   * @api private
   */
  load: function load (callback) {
    var self = this;
    self.createClients();
    self.masterCredentials.get(function () {
      self.service.config.credentials = self.masterCredentials;
      var operation = self.params.RoleOrn ?
        self.service.assumeRole : self.service.getSessionToken;
      operation.call(self.service, function (err, data) {
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
  loadMasterCredentials: function loadMasterCredentials (masterCredentials) {
    this.masterCredentials = masterCredentials || OWLHUB.config.credentials;
    while (this.masterCredentials.masterCredentials) {
      this.masterCredentials = this.masterCredentials.masterCredentials;
    }

    if (typeof this.masterCredentials.get !== 'function') {
      this.masterCredentials = new OWLHUB.Credentials(this.masterCredentials);
    }
  },

  /**
   * @api private
   */
  createClients: function () {
    this.service = this.service || new STS({params: this.params});
  }

});
