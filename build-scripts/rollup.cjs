/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");

const commonjs = require("@rollup/plugin-commonjs");
const resolve = require("@rollup/plugin-node-resolve");
const json = require("@rollup/plugin-json");
const babel = require("@rollup/plugin-babel").babel;
const replace = require("@rollup/plugin-replace");
const visualizer = require("rollup-plugin-visualizer");
const { string } = require("rollup-plugin-string");
const { terser } = require("rollup-plugin-terser");
const manifest = require("./rollup-plugins/manifest-plugin.cjs");
const worker = require("./rollup-plugins/worker-plugin.cjs");
const dontHashPlugin = require("./rollup-plugins/dont-hash-plugin.cjs");
const ignore = require("./rollup-plugins/ignore-plugin.cjs");

const bundle = require("./bundle.cjs");
const paths = require("./paths.cjs");

const extensions = [".js", ".ts"];

/**
 * @param {Object} arg
 * @param { import("rollup").InputOption } arg.input
 */
const createRollupConfig = ({
  entry,
  outputPath,
  defineOverlay,
  isProdBuild,
  latestBuild,
  isStatsBuild,
  publicPath,
  dontHash,
  isWDS,
}) => ({
  /**
   * @type { import("rollup").InputOptions }
   */
  inputOptions: {
    input: entry,
    // Some entry points contain no JavaScript. This setting silences a warning about that.
    // https://rollupjs.org/guide/en/#preserveentrysignatures
    preserveEntrySignatures: false,
    plugins: [
      ignore({
        files: bundle.emptyPackages({ latestBuild }),
      }),
      resolve({
        extensions,
        preferBuiltins: false,
        browser: true,
        rootDir: paths.polymer_dir,
      }),
      commonjs(),
      json(),
      babel({
        ...bundle.babelOptions({ latestBuild }),
        extensions,
        babelHelpers: isWDS ? "inline" : "bundled",
      }),
      string({
        // Import certain extensions as strings
        include: [path.join(paths.polymer_dir, "node_modules/**/*.css")],
      }),
      replace(bundle.definedVars({ isProdBuild, latestBuild, defineOverlay })),
      !isWDS &&
        manifest({
          publicPath,
        }),
      !isWDS && worker(),
      !isWDS && dontHashPlugin({ dontHash }),
      !isWDS && isProdBuild && terser(bundle.terserOptions(latestBuild)),
      !isWDS &&
        isStatsBuild &&
        visualizer({
          // https://github.com/btd/rollup-plugin-visualizer#options
          open: true,
          sourcemap: true,
        }),
    ].filter(Boolean),
  },
  /**
   * @type { import("rollup").OutputOptions }
   */
  outputOptions: {
    // https://rollupjs.org/guide/en/#outputdir
    dir: outputPath,
    // https://rollupjs.org/guide/en/#outputformat
    format: latestBuild ? "es" : "systemjs",
    // https://rollupjs.org/guide/en/#outputexternallivebindings
    externalLiveBindings: false,
    // https://rollupjs.org/guide/en/#outputentryfilenames
    // https://rollupjs.org/guide/en/#outputchunkfilenames
    // https://rollupjs.org/guide/en/#outputassetfilenames
    entryFileNames:
      isProdBuild && !isStatsBuild ? "[name]-[hash].js" : "[name].js",
    chunkFileNames: isProdBuild && !isStatsBuild ? "c.[hash].js" : "[name].js",
    assetFileNames: isProdBuild && !isStatsBuild ? "a.[hash].js" : "[name].js",
    // https://rollupjs.org/guide/en/#outputsourcemap
    sourcemap: isProdBuild ? true : "inline",
  },
});

const createKNXConfig = ({ isProdBuild, latestBuild }) =>
  createRollupConfig(bundle.config.knx({ isProdBuild, latestBuild }));

module.exports = {
  createKNXConfig: createKNXConfig,
};
