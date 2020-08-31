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

    compiler.hooks.afterCompile.tap(PLUGIN_NAME, (compilation) => {
      compilation.fileDependencies.add(require.resolve(compiler.context + DEFAULT_CONFIG_PATH));
    })

    compiler.hooks.emit.tapAsync(PLUGIN_NAME, (compilation, callback) => {
      delete require.cache[
        require.resolve(compiler.context + DEFAULT_CONFIG_PATH)
      ];
      const config = require(compiler.context + DEFAULT_CONFIG_PATH);

      let SHELL_SCRIPT = ""
      Object.keys(config).forEach(key => {
        SHELL_SCRIPT += `if [ "$${key}" == "" ];then\n`
                      + `  ${key}="${typeof(config[key]) == 'string' ? `'${config[key]}'` : config[key]}"\n`
                      + `elif [[ $${key} =~ ^-?([1-9][0-9]*)?[0-9]([.][0-9]+)?$ ]];then\n`
                      + `  ${key}=$${key}\n`
                      + `elif [ "$${key}" == "true" ] || [ "$${key}" == "false" ];then\n`
                      + `  ${key}=$${key}\n`
                      + `else\n`
                      + `  ${key}="'$${key}'"\n`
                      + `fi\n`
      })
      SHELL_SCRIPT += `echo "window['__RUNTIME_CONFIG__'] = {\n`
                    + `${Object.keys(config).map(key => `  ${key}: $${key},\n`).join("")}`
                    + `}" > ${DEFAULT_ASSET_NAME}\n`

      compilation.assets['generate_config.sh'] = {
        source: function () {
          return SHELL_SCRIPT;
        },
        size: function () {
          return SHELL_SCRIPT.length;
        },
      };

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
