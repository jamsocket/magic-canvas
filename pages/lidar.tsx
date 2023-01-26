import { useCallback, useEffect, useRef, useState } from 'react'
import { MagicCanvas } from '../dis-lib/MagicCanvas'
import createCamera from '../lib/camera'

import renderer from '../renderers/lidar.render'

/** How frequently to update the camera matrix. */
const TICK_INTERVAL_MS = 1000 / 30;

export default function App() {
  const [renderRemote, setRenderRemote] = useState<boolean>(false)
  const [viewMatrix, setViewMatrix] = useState<number[]>(new Array(16).fill(0))
  const cameraRef = useRef<ReturnType<typeof createCamera> | null>(null)

  const refCallback = useCallback((node: HTMLElement | null) => {
    if (node !== null) {
      cameraRef.current = createCamera(node)
    }
  }, [])

  useEffect(() => {
    let timeout = setTimeout(function updateState() {
      timeout = setTimeout(updateState, TICK_INTERVAL_MS)
      if (cameraRef.current === null) return
      cameraRef.current.tick()
      const cameraMatrix = cameraRef.current.getMatrix()
      if (!areArraysEqual(cameraMatrix, viewMatrix)) {
        setViewMatrix(Array.from(cameraMatrix))
      }
    }, TICK_INTERVAL_MS)

    return () => {
      clearTimeout(timeout)
    }
  }, [])

  return (
    <div>
      <div style={{ marginBottom: 10, display: 'flex', gap: 5, fontFamily: 'monospace', fontSize: 18 }}>
        <label><input
          type="checkbox"
          name="remote"
          value="remote"
          checked={renderRemote}
          onChange={() => setRenderRemote(!renderRemote)}
        />Remote rendering</label>
      </div>
      <div style={{ position: 'relative', height: 800, width: 1200 }} ref={refCallback}>
        <MagicCanvas
          height={800}
          width={1200}
          renderProps={{ matrix: viewMatrix }}
          remote={renderRemote}
          rendererUrl={renderer as any as string}
        />
      </div>
    </div>
  )
}

function areArraysEqual(arr1: ArrayLike<number>, arr2: ArrayLike<number>): boolean {
  if (arr1.length !== arr2.length) return false
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false
  }
  return true
}
