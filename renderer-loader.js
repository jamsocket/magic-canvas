const path = require('path');
const rollup = require('rollup');
const pluginTypescript = require('@rollup/plugin-typescript');
const pluginResolve = require('@rollup/plugin-node-resolve');

async function build(filename) {
  const plugins = [pluginResolve()]
  if (filename.endsWith('.ts')) {
    plugins.push(0, pluginTypescript())
  }

  const bundle = await rollup.rollup({
    input: filename,
    plugins,
  });

  const result = await bundle.generate({
    format: 'esm',
  })

  return result.output[0].code
}

module.exports = function (source) {
  const filename = path.basename(this.resourcePath).replace(/\.render\.[tj]s$/, '.render.js')

  const callback = this.async()

  build(this.resourcePath).then((source) => {
    this.emitFile(`static/${filename}`, source, null, { type: 'asset' })

    callback(null, `module.exports = "/_next/static/${filename}"`)
  }).catch((err) => {
    callback(err, null)
  })
}

module.exports.raw = true
