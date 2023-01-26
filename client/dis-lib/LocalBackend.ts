import { RenderBackend, RenderProps, RenderState } from "./MagicCanvas"
import { PromiseBox } from "./util"

/**
 * Expected type of messages sent to worker.js via postMessage.
 * 
 * Messages may have one or more of the top-level fields.
 * */
interface MessageToWorker {
  /** Initialization message.
   * The worker doesn't render anything until it receives this message. */
  init?: {
    /** URL of the renderer to load. */
    rendererUrl: string

    /** OffscreenCanvas to draw to. */
    canvas: OffscreenCanvas
  }

  /** Initial render state object. */
  renderState?: RenderState

  /** Properties to send to the worker. */
  renderProps?: RenderProps

  /** Request the current render state. */
  requestState?: true
}

/** Expected type of messages received from worker.js via onmessage. */
interface MessageFromWorker {
  /** Render state object. Expected after sending a message with requestState. */
  renderState?: RenderState
}

/** Wraps a Web Worker and the renderer running in it, providing a function-based
 * interface on top of postMessage/onmessage. */
class RenderWorker {
  /** Promise used to return state during a getRenderState call. */
  private statePromise: PromiseBox<RenderState> | null = null

  /** Underlying Web Worker. */
  private worker: Worker

  constructor() {
    this.worker = new Worker(new URL("./worker.js", import.meta.url))
    this.worker.onmessage = (e: { data: MessageFromWorker }) => {
      if (e.data.renderState !== undefined) {
        if (this.statePromise !== null) {
          this.statePromise.set(e.data.renderState)
        }
      }
    }
  }

  /** Send a message to the worker. Type-aware wrapper to worker.postMessage. */
  private send(msg: MessageToWorker, options?: StructuredSerializeOptions) {
    this.worker.postMessage(msg, options)
  }

  /** Set the render props. */
  setProps(props: RenderProps) {
    this.send({ renderProps: props })
  }

  setState(state: RenderState) {
    this.send({ renderState: state })
  }

  /** Initialize the worker. */
  init(rendererUrl: string, canvas: OffscreenCanvas, renderProps: RenderProps, renderState: RenderState) {
    this.send({ init: { rendererUrl, canvas }, renderState, renderProps }, { transfer: [canvas] })
  }

  /** Get the current render state.
   * This sets up a promise to receive the state, and sends a message to
   * the worker requesting the state.
  */
  getRenderState(): Promise<RenderState> {
    this.statePromise = new PromiseBox()
    this.send({ requestState: true })
    return this.statePromise.get()
  }

  /** Terminate the worker. */
  destroy() {
    this.worker.terminate()
  }
}

export class LocalBackend implements RenderBackend {
  container: PromiseBox<HTMLElement> = new PromiseBox()
  worker: RenderWorker
  canvas: HTMLCanvasElement | null = null

  constructor(private renderUrl: string, private renderProps: RenderState = {}, private initialRenderState: RenderState = {}) {
    this.worker = new RenderWorker()
    this.initWorker()
  }

  private async initWorker() {
    const canvas = await this.getCanvas()
    this.worker.init(this.renderUrl, canvas, this.renderProps, this.initialRenderState)
  }

  /** Return a new canvas element. If we already have a canvase element, delete it, to ensure that its context hasn't already been captured. */
  private async getCanvas(): Promise<OffscreenCanvas> {
    const container = await this.container.get()
    if (this.canvas !== null) {
      this.canvas.remove()
    }
    const canvas = document.createElement("canvas")

    canvas.height = container.clientHeight
    canvas.width = container.clientWidth

    // canvas.style.transition = 'all 150ms linear'
    // canvas.style.opacity = '1'
    canvas.style.border = '1px solid #ddd'
    canvas.style.width = `${canvas.width}px`
    canvas.style.height = `${canvas.height}px`
    canvas.style.pointerEvents = 'initial'

    this.canvas = canvas
    container.appendChild(canvas)
    const offscreenCanvas = canvas.transferControlToOffscreen()
    return offscreenCanvas
  }

  /** Set the container. No-op if the container is already set. */
  setContainer(container: HTMLElement) {
    this.container.set(container)
  }

  setRenderProps(props: RenderProps) {
    this.worker.setProps(props)
  }

  setRenderState(state: RenderState) {
    this.worker.setState(state)
  }

  getRenderState(): Promise<RenderState> {
    return this.worker.getRenderState()
  }

  destroy() {
    this.worker.destroy()
  }
}
