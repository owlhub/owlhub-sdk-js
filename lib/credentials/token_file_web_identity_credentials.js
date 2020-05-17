var OWLHUB = require('../core');
var fs = require('fs');
var STS = require('../../clients/sts');
var iniLoader = OWLHUB.util.iniLoader;

/**
 * Represents OIDC credentials from a file on disk
 * If the credentials expire, the SDK can {refresh} the credentials
 * from the file.
 *
 * ## Using the web identity token file
 *
 * This provider is checked by default in the Node.js environment. To use
 * the provider simply add your OIDC token to a file (ASCII encoding) and
 * share the filename in either OWLHUB_WEB_IDENTITY_TOKEN_FILE environment
 * variable or web_identity_token_file shared config variable
 *
 * The file contains encoded OIDC token and the characters are
 * ASCII encoded. OIDC tokens are JSON Web Tokens (JWT).
 * JWT's are 3 base64 encoded strings joined by the '.' character.
 *
 * This class will read filename from OWLHUB_WEB_IDENTITY_TOKEN_FILE
 * environment variable or web_identity_token_file shared config variable,
 * and get the OIDC token from filename.
 * It will also read IAM role to be assumed from OWLHUB_ROLE_ORN
 * environment variable or role_orn shared config variable.
 * This provider gets credetials using the {OWLHUB.STS.assumeRoleWithWebIdentity}
 * service operation
 *
 * @!macro nobrowser
 */
OWLHUB.TokenFileWebIdentityCredentials = OWLHUB.util.inherit(OWLHUB.Credentials, {

  /**
   * @example Creating a new credentials object
   *  OWLHUB.config.credentials = new OWLHUB.TokenFileWebIdentityCredentials(
   *   // optionally provide configuration to apply to the underlying OWLHUB.STS service client
   *   // if configuration is not provided, then configuration will be pulled from OWLHUB.config
   *   {
   *     // specify timeout options
   *     httpOptions: {
   *       timeout: 100
   *     }
   *   });
   * @see OWLHUB.Config
   */
  constructor: function TokenFileWebIdentityCredentials(clientConfig) {
    OWLHUB.Credentials.call(this);
    this.data = null;
    this.clientConfig = OWLHUB.util.copy(clientConfig || {});
  },

  /**
   * Returns params from environment variables
   *
   * @api private
   */
  getParamsFromEnv: function getParamsFromEnv() {
    var ENV_TOKEN_FILE = 'OWLHUB_WEB_IDENTITY_TOKEN_FILE',
      ENV_ROLE_ORN = 'OWLHUB_ROLE_ORN';
    if (process.env[ENV_TOKEN_FILE] && process.env[ENV_ROLE_ORN]) {
      return [{
        envTokenFile: process.env[ENV_TOKEN_FILE],
        roleOrn: process.env[ENV_ROLE_ORN],
        roleSessionName: process.env['OWLHUB_ROLE_SESSION_NAME']
      }];
    }
  },

  /**
   * Returns params from shared config variables
   *
   * @api private
   */
  getParamsFromSharedConfig: function getParamsFromSharedConfig() {
    var profiles = OWLHUB.util.getProfilesFromSharedConfig(iniLoader);
    var profileName = process.env.OWLHUB_PROFILE || OWLHUB.util.defaultProfile;
    var profile = profiles[profileName] || {};

    if (Object.keys(profile).length === 0) {
      throw OWLHUB.util.error(
        new Error('Profile ' + profileName + ' not found'),
        { code: 'TokenFileWebIdentityCredentialsProviderFailure' }
      );
    }

    var paramsArray = [];

    while (!profile['web_identity_token_file'] && profile['source_profile']) {
      paramsArray.unshift({
        roleOrn: profile['role_orn'],
        roleSessionName: profile['role_session_name']
      });
      var sourceProfile = profile['source_profile'];
      profile = profiles[sourceProfile];
    }

    paramsArray.unshift({
      envTokenFile: profile['web_identity_token_file'],
      roleOrn: profile['role_orn'],
      roleSessionName: profile['role_session_name']
    });

    return paramsArray;
  },

  /**
   * Refreshes credentials using {OWLHUB.STS.assumeRoleWithWebIdentity}
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
   */
  assumeRoleChaining: function assumeRoleChaining(paramsArray, callback) {
    var self = this;
    if (paramsArray.length === 0) {
      self.service.credentialsFrom(self.data, self);
      callback();
    } else {
      var params = paramsArray.shift();
      self.service.config.credentials = self.service.credentialsFrom(self.data, self);
      self.service.assumeRole(
        {
          RoleOrn: params.roleOrn,
          RoleSessionName: params.roleSessionName || 'token-file-web-identity'
        },
        function (err, data) {
          self.data = null;
          if (err) {
            callback(err);
          } else {
            self.data = data;
            self.assumeRoleChaining(paramsArray, callback);
          }
        }
      );
    }
  },

  /**
   * @api private
   */
  load: function load(callback) {
    var self = this;
    try {
      var paramsArray = self.getParamsFromEnv();
      if (!paramsArray) {
        paramsArray = self.getParamsFromSharedConfig();
      }
      if (paramsArray) {
        var params = paramsArray.shift();
        var oidcToken = fs.readFileSync(params.envTokenFile, {encoding: 'ascii'});
        if (!self.service) {
          self.createClients();
        }
        self.service.assumeRoleWithWebIdentity(
          {
            WebIdentityToken: oidcToken,
            RoleOrn: params.roleOrn,
            RoleSessionName: params.roleSessionName || 'token-file-web-identity'
          },
          function (err, data) {
            self.data = null;
            if (err) {
              callback(err);
            } else {
              self.data = data;
              self.assumeRoleChaining(paramsArray, callback);
            }
          }
        );
      }
    } catch (err) {
      callback(err);
    }
  },

  /**
   * @api private
   */
  createClients: function() {
    if (!this.service) {
      var stsConfig = OWLHUB.util.merge({}, this.clientConfig);
      this.service = new STS(stsConfig);

      // Retry in case of IDPCommunicationErrorException or InvalidIdentityToken
      this.service.retryableError = function(error) {
        if (error.code === 'IDPCommunicationErrorException' || error.code === 'InvalidIdentityToken') {
          return true;
        } else {
          return OWLHUB.Service.prototype.retryableError.call(this, error);
        }
      };
    }
  }
});
