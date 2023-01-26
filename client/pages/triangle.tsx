import { useState } from 'react'
import { MagicCanvas } from '../dis-lib/MagicCanvas'
import renderer from '../renderers/triangle.render'

export default function App() {
  const [renderRemote, setRenderRemote] = useState<boolean>(false)

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
        <label htmlFor="remote">Remote rendering</label>
      </div>
      <div style={{ width: 'fit-content', height: 'fit-content' }}>
        <MagicCanvas
          height={800}
          width={1200}
          remote={renderRemote}
          rendererUrl={renderer as any as string}
        />
      </div>
    </div>
  )
}
