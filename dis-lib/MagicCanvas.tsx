import React, { useCallback, useEffect, useRef } from "react"
import { LocalBackend } from "./LocalBackend"
import { RemoteBackend } from "./RemoteBackend"

// Types

export type RenderProps = Record<string, any>
export type RenderState = Record<string, any>

/** Backends generically represent the methods we can use to render:
 * local or remote.
 */
export interface RenderBackend {
  /** Set the container to render into. */
  setContainer: (container: HTMLElement) => void

  /** Set the props passed into the renderer on every frame. */
  setRenderProps: (props: RenderProps) => void

  setRenderState: (state: RenderState) => void

  /** Get the current render state. */
  getRenderState: () => Promise<RenderState>

  /** Clean up. */
  destroy: () => void
}

class MCanvas {
  remote: boolean = false
  container: HTMLElement | null = null
  localContainer: HTMLElement | null = null
  remoteContainer: HTMLElement | null = null

  localBackend: RenderBackend
  remoteBackend: RenderBackend

  constructor(renderUrl: string, renderProps: RenderProps = {}, initialRenderState: RenderState = {}) {
    this.localBackend = new LocalBackend(renderUrl, renderProps, initialRenderState)
    this.remoteBackend = new RemoteBackend(renderUrl, renderProps, initialRenderState)
  }

  setContainer(container: HTMLElement) {
    const innerContainer = document.createElement('div')
    innerContainer.classList.add('magiccanvas-root')
    innerContainer.style.position = 'relative'
    innerContainer.style.height = `${container.offsetHeight}px`
    innerContainer.style.width = `${container.offsetWidth}px`
    container.appendChild(innerContainer)

    const localContainer = document.createElement('div')
    localContainer.classList.add('magiccanvas-local')
    localContainer.style.position = 'absolute'
    localContainer.style.top = '0'
    localContainer.style.left = '0'
    localContainer.style.bottom = '0'
    localContainer.style.right = '0'
    localContainer.style.transition = 'all 150ms linear'
    localContainer.style.opacity = this.remote ? '0' : '1'
    container.appendChild(localContainer)

    const remoteContainer = document.createElement('div')
    remoteContainer.classList.add('magiccanvas-remote')
    remoteContainer.style.position = 'absolute'
    remoteContainer.style.top = '0'
    remoteContainer.style.left = '0'
    remoteContainer.style.bottom = '0'
    remoteContainer.style.right = '0'
    remoteContainer.style.transition = 'all 150ms linear'
    remoteContainer.style.opacity = this.remote ? '1' : '0'
    container.appendChild(remoteContainer)

    this.container = innerContainer
    this.localContainer = localContainer
    this.remoteContainer = remoteContainer

    this.localBackend.setContainer(localContainer)
    this.remoteBackend.setContainer(remoteContainer)
  }

  destroy() {
    this.localBackend.destroy()
    this.remoteBackend.destroy()
  }

  async setRemote(remote: boolean) {
    if (this.remote === remote) {
      return
    }

    this.remote = remote

    if (this.remote) {
      console.log('getting local state')
      let renderState = await this.localBackend.getRenderState()
      console.log('got local state', renderState)
      this.remoteBackend.setRenderState(renderState)      
    } else {
      console.log('getting remote state')
      let renderState = await this.remoteBackend.getRenderState()
      console.log('got remote state', renderState)
      this.localBackend.setRenderState(renderState)
    }

    if (this.localContainer !== null && this.remoteContainer !== null) {
      this.localContainer.style.opacity = this.remote ? '0' : '1'
      this.remoteContainer.style.opacity = this.remote ? '1' : '0'
    }
  }

  setRenderProps(props: RenderProps) {
    this.localBackend.setRenderProps(props)
    this.remoteBackend.setRenderProps(props)
  }
}

type MagicCanvasProps = {
  /** Height of the canvas. */
  height: number

  /** Width of the canvas. */
  width: number

  /** Props passed into the renderer. */
  renderProps?: RenderProps,

  /** Initial state passed to the renderer.
   * Changes to this after initialization are ignored,
   * because renderer is stateful. */
  initialRenderState?: RenderState,

  /** The URL of the JavaScript file to be loaded as the renderer.
   * Note: changes to this after initial construction currently have no effect.
  */
  rendererUrl: string

  /** Whether to run the renderer remotely. */
  remote?: boolean
}

/** Hook to create a MCanvas instance. */
function useMagicCanvas(rendererUrl: string, renderProps: RenderProps = {}, renderState: RenderState = {}): MCanvas {
  const mcRef = useRef<MCanvas | null>(null)

  if (typeof window === 'undefined') {
    // If we are in SSR, return a dummy object.
    return {} as MCanvas
  }

  if (mcRef.current === null) {
    mcRef.current = new MCanvas(rendererUrl, renderProps, renderState)
  }

  return mcRef.current
}

export function MagicCanvas(props: MagicCanvasProps): React.ReactElement {
  const mcRef = useMagicCanvas(props.rendererUrl, props.renderProps, props.initialRenderState)

  useEffect(() => {
    mcRef.setRenderProps(props.renderProps || {})
  }, [props.renderProps])

  useEffect(() => {
    mcRef.setRemote(props.remote || false)
  }, [props.remote])

  const setContainer = useCallback((container: HTMLElement | null) => {
    if (container === null) {
      mcRef.destroy()
    } else {
      mcRef.setContainer(container)
    }
  }, [])

  return <div
    ref={setContainer}
    style={{
      height: props.height,
      width: props.width,
      position: "relative",
    }}
  />
}
