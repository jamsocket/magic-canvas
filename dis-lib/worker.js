const workerState = {
  renderProps: {},
  renderState: {},
  rafHandle: null,
}

async function init({ rendererUrl, canvas }) {
  // Webpack will use its own import() shim unless we use a magic
  // incantation. See https://webpack.js.org/api/module-methods/#magic-comments
  const module = await import(/* webpackIgnore: true */ rendererUrl)
  const createRenderer = module.default

  const context = canvas.getContext('webgl')
  const render = await createRenderer(context)

  function loop() {
    render(workerState.renderProps, workerState.renderState)
    cancelAnimationFrame(workerState.rafHandle)
    workerState.rafHandle = requestAnimationFrame(loop)
  }
  cancelAnimationFrame(workerState.rafHandle)
  workerState.rafHandle = requestAnimationFrame(loop)
}

// NOTE: we want to adhere to a rule where this onmessage handler must not be async.
// This ensures that processing one part of a message (e.g. the init) will not block
// processing another part of the message (e.g. the state update)
onmessage = (msg) => {
  if (msg.data.init !== undefined) {
    const { rendererUrl, canvas } = msg.data.init
    init({ rendererUrl, canvas })
  }
  if (msg.data.renderState !== undefined) {
    workerState.renderState = msg.data.renderState
  }
  if (msg.data.renderProps !== undefined) {
    workerState.renderProps = msg.data.renderProps
  }
  if (msg.data.requestState === true) {
    postMessage({renderState: workerState.renderState})
  }
}
