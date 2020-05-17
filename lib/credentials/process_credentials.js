var OWLHUB = require('../core');
var proc = require('child_process');
var iniLoader = OWLHUB.util.iniLoader;

/**
 * Represents credentials loaded from shared credentials file
 * (defaulting to ~/.owlhub/credentials or defined by the
 * `OWLHUB_SHARED_CREDENTIALS_FILE` environment variable).
 *
 * ## Using process credentials
 *
 * The credentials file can specify a credential provider that executes
 * a given process and attempts to read its stdout to recieve a JSON payload
 * containing the credentials:
 *
 *     [default]
 *     credential_process = /usr/bin/credential_proc
 *
 * Automatically handles refreshing credentials if an Expiration time is
 * provided in the credentials payload. Credentials supplied in the same profile
 * will take precedence over the credential_process.
 *
 * Sourcing credentials from an external process can potentially be dangerous,
 * so proceed with caution. Other credential providers should be preferred if
 * at all possible. If using this option, you should make sure that the shared
 * credentials file is as locked down as possible using security best practices
 * for your operating system.
 *
 * ## Using custom profiles
 *
 * The SDK supports loading credentials for separate profiles. This can be done
 * in two ways:
 *
 * 1. Set the `OWLHUB_PROFILE` environment variable in your process prior to
 *    loading the SDK.
 * 2. Directly load the OWLHUB.ProcessCredentials provider:
 *
 * ```javascript
 * var creds = new OWLHUB.ProcessCredentials({profile: 'myprofile'});
 * OWLHUB.config.credentials = creds;
 * ```
 *
 * @!macro nobrowser
 */
OWLHUB.ProcessCredentials = OWLHUB.util.inherit(OWLHUB.Credentials, {
  /**
   * Creates a new ProcessCredentials object.
   *
   * @param options [map] a set of options
   * @option options profile [String] (OWLHUB_PROFILE env var or 'default')
   *   the name of the profile to load.
   * @option options filename [String] ('~/.owlhub/credentials' or defined by
   *   OWLHUB_SHARED_CREDENTIALS_FILE process env var)
   *   the filename to use when loading credentials.
   * @option options callback [Function] (err) Credentials are eagerly loaded
   *   by the constructor. When the callback is called with no error, the
   *   credentials have been loaded successfully.
   */
  constructor: function ProcessCredentials(options) {
    OWLHUB.Credentials.call(this);

    options = options || {};

    this.filename = options.filename;
    this.profile = options.profile || process.env.OWLHUB_PROFILE || OWLHUB.util.defaultProfile;
    this.get(options.callback || OWLHUB.util.fn.noop);
  },

  /**
   * @api private
   */
  load: function load(callback) {
    var self = this;
    try {
      var profiles = OWLHUB.util.getProfilesFromSharedConfig(iniLoader, this.filename);
      var profile = profiles[this.profile] || {};

      if (Object.keys(profile).length === 0) {
        throw OWLHUB.util.error(
          new Error('Profile ' + this.profile + ' not found'),
          { code: 'ProcessCredentialsProviderFailure' }
        );
      }

      if (profile['credential_process']) {
        this.loadViaCredentialProcess(profile, function(err, data) {
          if (err) {
            callback(err, null);
          } else {
            self.expired = false;
            self.accessKeyId = data.AccessKeyId;
            self.secretAccessKey = data.SecretAccessKey;
            self.sessionToken = data.SessionToken;
            if (data.Expiration) {
              self.expireTime = new Date(data.Expiration);
            }
            callback(null);
          }
        });
      } else {
        throw OWLHUB.util.error(
          new Error('Profile ' + this.profile + ' did not include credential process'),
          { code: 'ProcessCredentialsProviderFailure' }
        );
      }
    } catch (err) {
      callback(err);
    }
  },

  /**
   * Executes the credential_process and retrieves
   * credentials from the output
   * @api private
   * @param profile [map] credentials profile
   * @throws ProcessCredentialsProviderFailure
   */
  loadViaCredentialProcess: function loadViaCredentialProcess(profile, callback) {
    proc.exec(profile['credential_process'], function(err, stdOut, stdErr) {
      if (err) {
        callback(OWLHUB.util.error(
          new Error('credential_process returned error'),
          { code: 'ProcessCredentialsProviderFailure'}
        ), null);
      } else {
        try {
          var credData = JSON.parse(stdOut);
          if (credData.Expiration) {
            var currentTime = OWLHUB.util.date.getDate();
            var expireTime = new Date(credData.Expiration);
            if (expireTime < currentTime) {
              throw Error('credential_process returned expired credentials');
            }
          }

          if (credData.Version !== 1) {
            throw Error('credential_process does not return Version == 1');
          }
          callback(null, credData);
        } catch (err) {
          callback(OWLHUB.util.error(
            new Error(err.message),
            { code: 'ProcessCredentialsProviderFailure'}
          ), null);
        }
      }
    });
  },

  /**
   * Loads the credentials from the credential process
   *
   * @callback callback function(err)
   *   Called after the credential process has been executed. When this
   *   callback is called with no error, it means that the credentials
   *   information has been loaded into the object (as the `accessKeyId`,
   *   `secretAccessKey`, and `sessionToken` properties).
   *   @param err [Error] if an error occurred, this value will be filled
   * @see get
   */
  refresh: function refresh(callback) {
    iniLoader.clearCachedFiles();
    this.coalesceRefresh(callback || OWLHUB.util.fn.callback);
  }
});
