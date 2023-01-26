import React, { useCallback, useState } from 'react'
import { MagicCanvas } from '../dis-lib/MagicCanvas'
import renderer from '../renderers/box.render'

interface StateType {
  x: number
  y: number
}

export default function App() {
  const [renderRemote, setRenderRemote] = useState<boolean>(false)
  const [lightPosition, setLightPosition] = useState<StateType>({ x: 0, y: 0 })

  const updateValues = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect()
    const x = ((clientX - left) / width) * 2 - 1
    const y = -((clientY - top) / height) * 2 + 1
    setLightPosition({ x, y })
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
      <div style={{ width: 'fit-content', height: 'fit-content' }} onMouseMove={updateValues}>
        <MagicCanvas
          height={800}
          width={1200}
          remote={renderRemote}
          renderProps={lightPosition}
          rendererUrl={renderer as any as string}
        />
      </div>
    </div>
  )
}
