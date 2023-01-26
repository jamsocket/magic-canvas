# API

### MagicCanvas React Component

The `<MagicCanvas>` React component takes the following props:

- `width: number` - the width of the canvas in pixels (required)
- `height: number` - the height of the canvas in pixels (required)
- `rendererUrl: string` - the URL for the bundled Renderer JS (see Webpack Loader below for more info) (required)
- `renderProps: Record<string, any>` - an object with values to be passed to the Renderer's `render()` function on each frame (optional)
- `initialRenderState: Record<string, any>` - an object with values to initialize the renderer's internal state (optional)
- `remote: boolean` - a boolean (`false` by default) that indicates whether the canvas contents should be rendered remotely and streamed to the client (optional)


### The Renderer

The Renderer is the part of your application's code that takes a GL context and renders to it. A Renderer must have a `createRenderer(context)` function as a default export that takes a WebGL1 Rendering Context. (WebGL2 is not currently supported, but WebGPU support is coming soon!) This `createRenderer(context)` function should return a `render(props)` function that will be called on every frame with the values passed to the MagicCanvas component's `renderProps` prop.

For example:

```js
export default function createRenderer(context) {
  // do some setup with the context
  return function render(renderProps) {
    // do some rendering with the context + renderProps
  }
}
```

Note: the Renderer is not tied to a specific WebGL framework (e.g. THREE.js). Using a WebGL framework should work in most cases, though, as most frameworks support taking an existing WebGL context as an argument. You can also write a Renderer without any WebGL framework if you'd prefer to write raw WebGL code.

When rendering locally, the Renderer is run in a WebWorker. When rendering remotely, the Renderer is run in NodeJS. For this reason, Renderer code can't rely on browser-only APIs or DOM elements. This also means that `context.canvas` may not point to an actual canvas and instead be a thin shim. Values like `width` and `height` which are often accessed from the canvas element should be accessed with `context.drawingBufferWidth` and `context.drawingBufferHeight`.


### Webpack Loader

MagicCanvas currently provides a Webpack loader for producing a JS bundle using the `.render.js` (or `.render.ts`) file as an entrypoint, which it saves to the `static` directory. At build time, the loader replaces imports of the `.render.js` file with a URL to the bundled JS. This URL should be passed to the MagicCanvas as the `rendererUrl` prop. For example:

```jsx
// the Webpack Loader transforms this import into a URL that points to the bundled render.js file
import myDemoUrl from './my-demo.render

// ...

<MagicCanvas
  rendererUrl={myDemoUrl}
  // ...
/>
```

Adding the loader to a NextJS config, for example:

```js
const magicCanvasLoader = require('magic-canvas-loader')
module.exports = {
  webpack: (config) => {
    config.module.rules.push({
      test: /\.render.[tj]s$/,
      use: [{ loader: magicCanvasLoader }]
    })
    return config
  }
}
```
