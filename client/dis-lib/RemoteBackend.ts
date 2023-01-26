import { RenderBackend, RenderProps, RenderState } from "./MagicCanvas";
import { PromiseBox } from "./util";

/** Copy of IncomingMessage from the handler; todo: make this an import from a common package. */
interface MessageToRemote {
  /** Update the local render props. */
  renderProps?: RenderProps

  /** Register the active websocket connection as a belonging to the client or streamer. */
  register?: 'client'

  init?: {
    /** Renderer JavaScript module as a string. */
    renderer: string
  }

  /** Initial render state. */
  renderState?: RenderState

  toStreamer?: {
    /** Send the RTC SDP to the other party. */
    rtc?: RTCSessionDescriptionInit

    /** Send the ICE candidate to the other party. */
    ice?: { candidate: string }
  }

  requestState?: boolean
}

interface MessageFromRemote {
  renderState?: RenderState

  rtc?: RTCSessionDescriptionInit
}

/** Represents a WebSocket connection to a remote handler. */
class HandlerConnection {
  ws: WebSocket
  private _remoteSdp: PromiseBox<RTCSessionDescriptionInit>
  private _ready: PromiseBox<void>
  private statePromise: PromiseBox<RenderState> | null = null

  constructor(url: string) {
    this._remoteSdp = new PromiseBox()
    this._ready = new PromiseBox()
    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      console.log("Connected to handler.")
      this._ready.set()
    }

    this.ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      this.dispatch(msg)
    }

    this.ws.onerror = (e) => {
      console.log('error', e)
    }
  }

  async init(rendererJavascript: string, initialRenderProps: RenderProps, initialRenderState: RenderState) {
    await this._ready.get()
    this.send({
      register: "client",
      init: {
        renderer: rendererJavascript,
      },
      renderState: initialRenderState,
      renderProps: initialRenderProps
    })
  }

  updateProps(props: RenderProps) {
    this.send({ renderProps: props })
  }

  updateState(state: RenderState) {
    this.send({ renderState: state })
  }

  remoteSdp(): Promise<RTCSessionDescriptionInit> {
    return this._remoteSdp.get()
  }

  sendSdp(sdp: RTCSessionDescriptionInit) {
    this.send({ toStreamer: { rtc: sdp } })
  }

  destroy() {
    this.ws.close()
  }

  private dispatch(msg: MessageFromRemote) {
    console.log('Got message', msg)
    if (msg.rtc !== undefined) {
      this._remoteSdp.set(msg.rtc)
    }
    if (msg.renderState !== undefined) {
      if (this.statePromise !== null) {
        this.statePromise.set(msg.renderState)
      }
    }
  }

  private send(msg: MessageToRemote) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }

  getRenderState(): Promise<RenderState> {
    this.statePromise = new PromiseBox()
    this.send({ requestState: true })
    return this.statePromise.get()
  }

  ready(): Promise<void> {
    return this._ready.get()
  }
}

class RTCConnection {
  conn: RTCPeerConnection
  iceGatheringComplete: PromiseBox<void> = new PromiseBox()

  constructor(
    private handlerConnection: HandlerConnection,
    private rendererUrl: string,
    private initialRenderProps: RenderProps,
    private initialRenderState: RenderState,
    private videoEl: HTMLVideoElement
  ) {

    // for the client, this URL will end up being a jamsocket backend
    this.conn = new RTCPeerConnection({
	    bundlePolicy: "max-bundle",
	    iceTransportPolicy: "relay",
      iceServers: [
        {
          urls: "stun:relay.metered.ca:80",
        },
        {
          urls: "turn:relay.metered.ca:80",
          username: "c7f21a3a3a5f693e365dbc55",
          credential: "FyMQ1pmIIaUiFeCQ",
        },
        {
          urls: "turn:relay.metered.ca:443",
          username: "c7f21a3a3a5f693e365dbc55",
          credential: "FyMQ1pmIIaUiFeCQ",
        },
        {
          urls: "turn:relay.metered.ca:443?transport=tcp",
          username: "c7f21a3a3a5f693e365dbc55",
          credential: "FyMQ1pmIIaUiFeCQ",
        },
      ],
    });

    this.conn.onicecandidate = (e) => {
      console.log('Candidate', e)
      console.log('status', this.conn?.iceGatheringState)
    }

    this.conn.ontrack = (t) => {
      console.log('Got track')
      this.videoEl.srcObject = t.streams[0]
      console.log('paused', this.videoEl.paused)
    }

    this.conn.onicegatheringstatechange = () => {
      console.log("Ice gathering state", this.conn.iceGatheringState)
      if (this.conn.iceGatheringState === "complete") {
        this.iceGatheringComplete.set()
      }
    }
  }

  async connect() {
    console.log("Fetching renderer")
    let rendererJavascript = await fetch(this.rendererUrl).then(r => r.text())

    console.log("Calling init on handler")
    this.handlerConnection.init(rendererJavascript, this.initialRenderProps, this.initialRenderState)

    console.log('Waiting for server SDP')
    const sdp = await this.handlerConnection.remoteSdp()

    console.log('Gathering ICE candidates.')
    await this.conn.setRemoteDescription(sdp)

    console.log('Creating an answer.')
    const answer = await this.conn.createAnswer()

    console.log('Setting local description.')
    await this.conn.setLocalDescription(answer)
    await this.iceGatheringComplete.get()

    if (this.conn.localDescription === null) {
      throw new Error('conn.localDescription should not be null')
    }

    console.log('Sending client description.', this.conn.localDescription)
    this.handlerConnection.sendSdp(this.conn.localDescription)
  }
}

export class RemoteBackend implements RenderBackend {
  container: PromiseBox<HTMLElement> = new PromiseBox()
  connection: HandlerConnection
  rtcConnection: RTCConnection | null = null
  videoElement: HTMLVideoElement | null = null

  getWsUrl(): string {
    const url = new URL(window.location.href)
    if (url.protocol === 'https:') {
      url.protocol = 'wss:'
    } else {
      url.protocol = 'ws:'
    }

    url.pathname = '/ws'
    url.port = '8080'

    return url.href
  }

  constructor(private renderUrl: string, private renderProps: RenderState = {}, private initialRenderState: RenderState = {}) {
    this.connection = new HandlerConnection(this.getWsUrl())
    this.initConnection()
  }

  private async initConnection() {
    await this.connection.init(this.renderUrl, this.renderProps, this.initialRenderState)
    this.rtcConnection = new RTCConnection(this.connection, this.renderUrl, this.renderProps, this.initialRenderState, await this.getVideoElement())
    await this.rtcConnection.connect()
  }

  /** If we already have a video element, return it; otherwise, create one (waiting for the container if necessary) */
  private async getVideoElement(): Promise<HTMLVideoElement> {
    if (this.videoElement !== null) {
      return this.videoElement
    }

    const container = await this.container.get()
    const video = document.createElement("video")

    video.height = container.clientHeight
    video.width = container.clientWidth

    video.autoplay = true
    video.muted = true
    video.playsInline = true
    // video.style.width = "100%"
    // video.style.height = "100%"

    video.style.transition = 'all 150ms linear'
    video.style.border = '1px solid #ddd'
    video.style.width = '100%'
    video.style.height = '100%'
    video.style.opacity = '1'
    video.style.pointerEvents = 'initial'

    container.appendChild(video)
    this.videoElement = video
    return video
  }

  /** Set the container. No-op if the container is already set. */
  setContainer(container: HTMLElement) {
    this.container.set(container)
  }

  setRenderProps(props: RenderProps) {
    this.connection.updateProps(props)
  }

  setRenderState(state: RenderState) {
    this.connection.updateState(state)
  }

  getRenderState(): Promise<RenderState> {
    return this.connection.getRenderState()
  }

  destroy() {
    this.connection.destroy()
  }
}
