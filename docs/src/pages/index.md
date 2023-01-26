# MagicCanvas

**MagicCanvas is a React component for pixel-streaming WebGL.**

Apps that integrate `MagicCanvas` can swap between client-side WebGL rendering and server-side rendering at the click of a button. This allows applications to scale to more powerful cloud hardware when rendering complex scenes or loading large datasets.

To the end user, the transition between local and remote is barely perceptible. It’s magic.

## Demo

<iframe width="560" height="315" src="https://www.youtube.com/embed/jFhsKrnHHzk" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

## React example

An application needs to do two things to use MagicCanvas:
- Impelement a *renderer*. This is a self-contained JavaScript bundle that exports a function matching a certain signature.
- Create an instance of the `<MagicCanvas />` component, and pass the renderer into it.

Here’s an example of how to use MagicCanvas in your codebase:

```jsx
import React from 'react'
import { MagicCanvas } from 'react-magic-canvas'
import boxDemoUrl from './box.render'

export default function App() {
  const lightPosition = { x: 500, y: 750 }
  return (
    <MagicCanvas
      height={800}
      width={1200}
      renderState={lightPosition}
      rendererUrl={boxDemoUrl}
      remote={true}
    />
  )
}
```

Then, in `box.render.js`, we need to export a `createRenderer` function which takes a `WebGLRenderingContext` and returns a `render` function to be called on each frame. Notice that the `render()` function gets the value of the `renderState` prop passed to it:

```js
import * as THREE from 'three'

export default function createRenderer(context) {
  const renderer = new THREE.WebGLRenderer({
    context,
    canvas: context.canvas
  })
  renderer.setClearColor(0x000000 /* black */, 1)

  const scene = new THREE.Scene()
  const geometry = new THREE.BoxGeometry(2, 2, 2)
  const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 })
  const cube = new THREE.Mesh(geometry, material)
  const light = new THREE.PointLight(0xffffff, 1, 100)
  const camera = new THREE.PerspectiveCamera(75, 1.0, 0.1, 1000)
  camera.position.z = 5

  scene.add(light)
  scene.add(cube)

  return function render(lightPosition) {
    light.position.x = lightPosition.x
    light.position.y = lightPosition.y

    cube.rotation.x += 0.01
    cube.rotation.y += 0.01

    renderer.render(scene, camera)
  }
}
```

The above code will render the scene in a NodeJS backend and stream the result to the client, while streaming changes to the `lightPosition` state in the client back to the Renderer over WebSockets.

## Future features

- WebGPU support!
- Support canvas resizing
- Support compositing locally-rendered content with remotely-rendered content
- Better shims for browser-dependent code
- Broader support for JavaScript bundlers and build tools - not just Webpack and Webpack-compatible frameworks (like NextJS)
- Better serialization format for `renderState` values (other than JSON, which doesn't serialize/deserialize Dates or TypedArrays very well, e.g.)


## Learn more

- [Walk through a ThreeJS example](/docs/three-example)
- [See the API docs](/docs/api)
