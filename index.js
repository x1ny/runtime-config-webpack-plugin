const HtmlWebpackPlugin = require('html-webpack-plugin');

const PLUGIN_NAME = "RuntimeConfigWebpackPlugin";
const DEFAULT_EXTERNAL_NAME = "runtime-config";
const DEFAULT_EXTERNAL_VALUE = "__RUNTIME_CONFIG__";
const DEFAULT_CONFIG_PATH = "/src/runtimeConfig.json";
const DEFAULT_ASSET_NAME = "runtime-config.js";

class RuntimeConfigWebpackPlugin {
  apply(compiler) {
    if (!compiler.options.externals) compiler.options.externals = {};
    compiler.options.externals[DEFAULT_EXTERNAL_NAME] = DEFAULT_EXTERNAL_VALUE;

    compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
      HtmlWebpackPlugin.getHooks(compilation).beforeAssetTagGeneration.tapAsync(
        PLUGIN_NAME,
        (data, cb) => {
          data.assets.js.unshift(DEFAULT_ASSET_NAME);
          cb(null, data);
        }
      );
    });

    compiler.hooks.emit.tapAsync(PLUGIN_NAME, (compilation, callback) => {
      delete require.cache[
        require.resolve(compiler.context + DEFAULT_CONFIG_PATH)
      ];
      const config = require(compiler.context + DEFAULT_CONFIG_PATH);
      const content = `window['${DEFAULT_EXTERNAL_VALUE}'] = ${JSON.stringify(
        config
      )}`;

      compilation.assets[DEFAULT_ASSET_NAME] = {
        source: function () {
          return content;
        },
        size: function () {
          return content.length;
        },
      };

      callback();
    });
  }
}

module.exports = RuntimeConfigWebpackPlugin;
