var AssetFactory, AssetPipeline, AssetRack, Fiber, Snockets, logger, path, rack, _,
  __bind = function (fn, me) {
    return function () {
      return fn.apply(me, arguments);
    };
  },
  __hasProp = {}.hasOwnProperty,
  __extends = function (child, parent) {
    for (var key in parent) {
      if (__hasProp.call(parent, key)) child[key] = parent[key];
    }
    function ctor() {
      this.constructor = child;
    }

    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
    child.__super__ = parent.prototype;
    return child;
  };

_ = require('underscore');

rack = require('asset-rack');
path = require('path');
Fiber = require('fibers');
Snockets = require('snockets');
AssetFactory = require('./asset_factory');

AssetRack = (function (_super) {

  __extends(AssetRack, _super);

  function AssetRack() {
    this.findOrCreateAsset = __bind(this.findOrCreateAsset, this);

    this.css = __bind(this.css, this);

    this.js = __bind(this.js, this);

    this.handle = __bind(this.handle, this);

    var _ref;
    this.assetDir = path.resolve("" + __dirname + "/../../assets");
    this.env = (_ref = process.env.NODE_ENV) != null ? _ref : 'development';
    this.factory = new AssetFactory(this.assetDir, this.env);
    AssetRack.__super__.constructor.call(this, []);
  }

  AssetRack.prototype.handle = function (request, response, next) {
    var _render;
    response.locals.css = this.css;
    response.locals.js = this.js;
    _render = response.render;
    response.render = function (view, options, callback) {
      var _this = this;
      return Fiber(function () {
        return _render.call(response, view, options, callback);
      }).run();
    };
    return AssetRack.__super__.handle.call(this, request, response, next);
  };

  AssetRack.prototype.js = function (name) {
    var file, filename, files, subname, tag, tags, type, _i, _len;
    type = 'js';
    if (this.env === 'development') {
      filename = this.factory.filename(type, name);
      files = new Snockets().getCompiledChain(filename, {
        async: false
      });
      tags = [];
      for (_i = 0, _len = files.length; _i < _len; _i++) {
        file = files[_i];
        subname = this.factory.basename(type, file.filename);
        this.findOrCreateAsset(type, subname, file.js);
        tag = this.tag("/js/" + subname + ".js");
        tags.push(tag);
      }
      return tags.join('');
    } else {
      this.findOrCreateAsset(type, name);
      return this.tag("/js/" + name + ".js");
    }
  };

  AssetRack.prototype.css = function (name) {
    var type;
    type = 'css';
    this.findOrCreateAsset(type, name);
    return this.tag("/css/" + name + ".css");
  };

  AssetRack.prototype.findOrCreateAsset = function (type, name, contents) {
    var asset, complete, done, fiber, ident, yielded,
      _this = this;
    ident = "" + name + "." + type;
    fiber = Fiber.current;
    complete = yielded = false;
    asset = _(this.assets).find(function (asset) {
      return asset.lookup === ident;
    });
    if (asset != null) {
//      logger.debug(function () {
//        return "Found asset: " + ident;
//      });
      return asset;
    } else {
//      logger.debug(function () {
//        return "Creating asset: " + ident;
//      });
      done = false;
      asset = this.factory.create(type, name, contents);
      asset.rack = this;
      asset.lookup = ident;
      asset.removeAllListeners('error');
      asset.emit('start');
      asset.on('error', function (err) {
        var _this = this;
//        logger.error(function () {
//          return "Error with asset: " + _this.url;
//        });
        console.log(err);
        complete = true;
        if (yielded) {
          return fiber.run();
        }
      });
      asset.on('complete', function () {
        if (asset.contents != null) {
          _this.assets.push(asset);
        }
        if (asset.assets != null) {
          _this.assets = _this.assets.concat(asset.assets);
        }
//        logger.debug(function () {
//          return "Asset compiled: " + ident;
//        });
        complete = true;
        if (yielded) {
          return fiber.run();
        }
      });
      if (!complete) {
        yielded = true;
        Fiber["yield"]();
      }
      return asset;
    }
  };

  return AssetRack;

})(rack.Rack);

AssetPipeline = (function () {

  function AssetPipeline() {
    this.precompile = __bind(this.precompile, this);
    this.middleware = new AssetRack();
    this.middleware.on('complete', function () {
//      return logger.debug(function () {
//        return 'Asset pipelines complete';
//      });
    });
    this.middleware.removeAllListeners('error');
    this.middleware.on('error', function () {
    });
  }

  AssetPipeline.prototype.precompile = function (args) {
    var _this = this;
    return Fiber(function () {
      var css, js, _i, _j, _len, _len1, _ref, _ref1, _results;
      _ref = args.js;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        js = _ref[_i];
        _this.middleware.js(js);
      }
      _ref1 = args.css;
      _results = [];
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        css = _ref1[_j];
        _results.push(_this.middleware.css(css));
      }
      return _results;
    }).run();
  };

  return AssetPipeline;

})();

module.exports = new AssetPipeline();
