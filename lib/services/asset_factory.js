var AssetFactory, fs, rack, _,
  __bind = function (fn, me) {
    return function () {
      return fn.apply(me, arguments);
    };
  };

_ = require('underscore');
fs = require('fs');
rack = require('asset-rack');

AssetFactory = (function () {

  AssetFactory.prototype.config = {
    js: {
      mimetype: 'text/javascript',
      assetClass: rack.SnocketsAsset,
      extensions: ['js', 'coffee']
    },
    css: {
      mimetype: 'text/css',
      assetClass: rack.LessAsset,
      extensions: ['css', 'less']
    }
  };

  function AssetFactory(assetDir, env) {
    this.assetDir = assetDir;
    this.env = env;
    this.basename = __bind(this.basename, this);

    this.filename = __bind(this.filename, this);

    this.create = __bind(this.create, this);

    this.configFor = __bind(this.configFor, this);

  }

  AssetFactory.prototype.configFor = function (type) {
    var config;
    config = this.config[type];
    if (config == null) {
      throw "Unknown asset type: " + type;
    }
    return config;
  };

  AssetFactory.prototype.create = function (type, name, contents) {
    var assetClass, assetOpts, config;
    config = this.configFor(type);
    assetOpts = {
      url: "/" + type + "/" + name + "." + type,
      hash: this.env !== 'development'
    };
    if (contents != null) {
      assetOpts.contents = contents;
      assetOpts.mimetype = config.mimetype;
    } else {
      assetOpts.filename = this.filename(type, name);
    }
    assetClass = contents != null ? rack.Asset : config.assetClass;
    return new assetClass(assetOpts);
  };

  AssetFactory.prototype.filename = function (type, name) {
    var basename, ext, _i, _len, _ref;
    basename = "" + this.assetDir + "/" + type + "/" + name;
    _ref = this.configFor(type).extensions;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      ext = _ref[_i];
      if (fs.existsSync("" + basename + "." + ext)) {
        return "" + basename + "." + ext;
      }
    }
    throw "Cannot find file: " + basename + "." + type;
  };

  AssetFactory.prototype.basename = function (type, filename) {
    var exts;
    exts = _(this.configFor(type).extensions).join('|');
    return filename.replace("" + this.assetDir + "/" + type + "/", '').replace(RegExp("\\.(" + exts + ")$"), '');
  };

  return AssetFactory;

})();

module.exports = AssetFactory;
