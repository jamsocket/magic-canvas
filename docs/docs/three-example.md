# An Example using THREE.js

Let's walk through a simple THREE.js demo using MagicCanvas. To start, our demo will just render a rotating cube.

### The Renderer file

When using MagicCanvas, we need to write our WebGL-rendering code in a separate file with
a `.render.js` (or `.render.ts`) extension. The Renderer file must export a `createRenderer()`
function which takes a WebGL1 rendering context and should return a `render()` function to be called on each frame.

In `box.render.js`:

```js
import * as THREE from 'three'

export default function createRenderer(context) {
  const renderer = new THREE.WebGLRenderer({ context, canvas: context.canvas })
  renderer.setClearColor(0x000000, 1)

  const scene = new THREE.Scene()
  const geometry = new THREE.BoxGeometry(2, 2, 2)
  const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 })
  const cube = new THREE.Mesh(geometry, material)
  const camera = new THREE.PerspectiveCamera(75, 1.0, 0.1, 1000)
  camera.position.z = 5

  scene.add(cube)

  return function render() {
    cube.rotation.x += 0.01
    cube.rotation.y += 0.01
    renderer.render(scene, camera)
  }
}
```

When writing a Renderer, you'll want to remember that **Renderer code may be run in a WebWorker or in a non-browser context on the server.**

This means we can't access DOM elements or rely on values you'd normally have available in a browser (e.g. `window.innerWidth`). This also means that `context.canvas` may be a Dummy Canvas that doesn't have the methods or properties you'd find on a real canvas element. (Here, we are passing `context.canvas` to the `new THREE.WebGLRenderer()` call to prevent ThreeJS from trying to create a new canvas.) To get width and height, we need to rely on WebGLRenderingContext values (e.g. `context.drawingBufferWidth`).

WebGL and `fetch()` are available in both contexts.

### The MagicCanvas component

Now that we have our Renderer written, let's use a `MagicCanvas` React Component to render our ThreeJS demo in a local WebWorker.

```jsx
import React from 'react'
import { MagicCanvas } from 'react-magic-canvas'
import boxDemoUrl from './box.render'

export default function App() {
  return (
    <MagicCanvas
      width={1200}
      height={800}
      rendererUrl={boxDemoUrl}
    />
  )
}
```

In the simplest case, we just need to import our Renderer:

```js
import boxDemoUrl from './box.render'
```

And here, we need to rely on the MagicCanvas Webpack Loader. This looks for files with a `.render.js` (or `.render.ts`) extensions and builds them into stand-alone JS modules. So the value we get out of our `import boxDemoUrl from './box.render'` statement is *actually* a URL. All `MagicCanvas` really requires of us is to provide it a `width`, `height`, and `rendererUrl`.

If you’re not using Next.js or Webpack, you can use another bundler to create the renderer bundle. The important thing is that the renderer is bundled independent of your other application code, because whether it is running locally or remotely, it runs in isolation from the rest of your application.

This should give us a rotating cube, rendered in a WebWorker, off the main thread.

### Remote rendering

The most compelling feature of MagicCanvas, though, is its ability to render in the backend and stream the result as a video to the frontend. Let's turn that on by simply passing a `remote={true}` prop to the `MagicCanvas` component:

```jsx
<MagicCanvas
  width={1200}
  height={800}
  rendererUrl={boxDemoUrl}
  remote={true}
/>
```

This will connect to the server over WebSocket, upload the renderer, establish a WebRTC connection, and synchronize state between the client and server. 

### Render props

What if we want to render our demo based on some props passed into the MagicCanvas? Let's augment our demo by adding a light that moves around the scene with our mouse.

In `box.renderer.js`, before the render function, let's create a light and add it to the scene:

```js
const light = new THREE.PointLight(0xffffff, 1, 100)
light.position.set(0, 0, 9)
scene.add(light)
```

Then, let's modify the render function to take the light position as an argument and set it on the ThreeJS light:

```js
return function render(lightPosition) {
  light.position.x = 10 * lightPosition.x
  light.position.y = 10 * lightPosition.y
  // the remainder of the function snipped for brevity
}
```

Now, back in our React code, we'll hold our light position in the React Component's state, and pass it to the `MagicCanvas` component:

```jsx
const [lightPosition, setLightPosition] = useState({ x: 0, y: 0 })

// then, further down:

<MagicCanvas
  width={1200}
  height={800}
  rendererUrl={boxDemoUrl}
  remote={true}
  renderProps={lightPosition}
/>
```

Finally, let's set the light position based on the mouse position by wrapping the `MagicCanvas` in a `<div>` and adding an `onMouseMove` event handler to it:

```jsx
const onMouseMove = useCallback(({ clientX, clientY, currentTarget }) => {
  const { left, top, width, height } = currentTarget.getBoundingClientRect()
  setLightPosition({
    x: ((clientX - left) / width) * 2 - 1,
    y: ((clientY - top) / height) * -2 + 1
  })
}, [])

// ...

<div onMouseMove={onMouseMove} style={{ width: 'fit-content', height: 'fit-content' }}>
  <MagicCanvas ... />
</div>
```

That's it! Now we should have a MagicCanvas component that passes updates to its `renderProps` prop along to the Renderer on each frame.

When rendering locally (with `remote={false}`), these state updates are sent as messages to the WebWorker where the Renderer is running. When rendering remotely (with `remote={true}`), the state updates are sent over WebSockets to the Renderer running in the backend.
