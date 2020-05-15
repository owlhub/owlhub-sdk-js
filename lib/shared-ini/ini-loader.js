var OWLHUB = require('../core');
var os = require('os');
var path = require('path');

function parseFile(filename, isConfig) {
    var content = OWLHUB.util.ini.parse(OWLHUB.util.readFileSync(filename));
    var tmpContent = {};
    Object.keys(content).forEach(function(profileName) {
      var profileContent = content[profileName];
      profileName = isConfig ? profileName.replace(/^profile\s/, '') : profileName;
      Object.defineProperty(tmpContent, profileName, {
        value: profileContent,
        enumerable: true
      });
    });
    return tmpContent;
}

/**
 * Ini file loader class the same as that used in the SDK. It loads and
 * parses config and credentials files in .ini format and cache the content
 * to assure files are only read once.
 * Note that calling operations on the instance instantiated from this class
 * won't affect the behavior of SDK since SDK uses an internal singleton of
 * this class.
 * @!macro nobrowser
 */
OWLHUB.IniLoader = OWLHUB.util.inherit({
  constructor: function IniLoader() {
    this.resolvedProfiles = {};
  },

  /** Remove all cached files. Used after config files are updated. */
  clearCachedFiles: function clearCachedFiles() {
    this.resolvedProfiles = {};
  },
  
  /**
   * Load configurations from config/credentials files and cache them
   * for later use. If no file is specified it will try to load default
   * files.
   * @param options [map] information describing the file
   * @option options filename [String] ('~/.owlhub/credentials' or defined by
   *   OWLHUB_SHARED_CREDENTIALS_FILE process env var or '~/.owlhub/config' if
   *   isConfig is set to true)
   *   path to the file to be read.
   * @option options isConfig [Boolean] (false) True to read config file.
   * @return [map<String,String>] object containing contents from file in key-value
   *   pairs.
   */
  loadFrom: function loadFrom(options) {
    options = options || {};
    var isConfig = options.isConfig === true;
    var filename = options.filename || this.getDefaultFilePath(isConfig);
    if (!this.resolvedProfiles[filename]) {
      var fileContent = this.parseFile(filename, isConfig);
      Object.defineProperty(this.resolvedProfiles, filename, { value: fileContent });
    }
    return this.resolvedProfiles[filename];
  },
  
  /**
   * @api private
   */
  parseFile: parseFile,
  
  /**
   * @api private
   */
  getDefaultFilePath: function getDefaultFilePath(isConfig) {
    return path.join(
      this.getHomeDir(),
      '.owlhub',
      isConfig ? 'config' : 'credentials'
    );
  },
  
  /**
   * @api private
   */
  getHomeDir: function getHomeDir() {
    var env = process.env;
    var home = env.HOME ||
      env.USERPROFILE ||
      (env.HOMEPATH ? ((env.HOMEDRIVE || 'C:/') + env.HOMEPATH) : null);

    if (home) {
      return home;
    }
    
    if (typeof os.homedir === 'function') {
      return os.homedir();
    }

    throw OWLHUB.util.error(
      new Error('Cannot load credentials, HOME path not set')
    );
  }
});

var IniLoader = OWLHUB.IniLoader;

module.exports = {
  IniLoader: IniLoader,
  parseFile: parseFile,
};
