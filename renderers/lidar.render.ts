import { mat4 } from 'gl-matrix'

export default async function createRenderer(gl: WebGLRenderingContext) {
  const ext = gl.getExtension('OES_texture_float')
  if (!ext) {
    throw new Error('Unable to get OES_texture_float extension')
  }

  // const config = { dataset: '987210.bin', fadeHeightOffsetRange: [350, 1000] }
  // const config = { dataset: 'midtown-sampled-sm.bin', fadeHeightOffsetRange: [450, 1200] }
  const config = { dataset: 'midtown-sampled-md.bin', fadeHeightOffsetRange: [450, 1200] }
  // const config = { dataset: 'midtown-sampled-lg.bin', fadeHeightOffsetRange: [450, 1200] }
  // const config = { dataset: 'midtown-sampled-xl.bin', fadeHeightOffsetRange: [450, 1200] }
  // const config = { dataset: 'manhattan-sampled-sm.bin', fadeHeightOffsetRange: [900, 2400] }
  // const config = { dataset: 'manhattan-sampled-md.bin', fadeHeightOffsetRange: [900, 2400] }
  // const config = { dataset: 'manhattan-sampled-lg.bin', fadeHeightOffsetRange: [900, 2400] }


  const result = await getLidarStreamer(gl, `https://nyc-lidar-demo.s3.amazonaws.com/${config.dataset}`)

  const { getCurrentPointCount, offset, buffer, batchIds, animationTextureSize, animationTexture } = result

  const minZ = offset[2]

  const vs = `
  precision highp float;

  attribute vec3 position;
  attribute float intensity;
  attribute float batchId;
  uniform mat4 projection;
  uniform mat4 view;
  uniform float fadeHeightStart;
  uniform float fadeHeightEnd;
  uniform sampler2D animationStartTexture;
  uniform float textureSize;
  uniform float time;
  varying vec4 color;

  #define C1 vec3(0.22745, 0.06667, 0.10980)
  #define C2 vec3(0.34118, 0.28627, 0.31765)
  #define C3 vec3(0.51373, 0.59608, 0.55686)
  #define C4 vec3(0.73725, 0.87059, 0.64706)
  #define C5 vec3(0.90196, 0.97647, 0.73725)

  vec3 getColorFromPalette(float t) {
    if (t < 0.25) return mix(C1, C2, smoothstep(0.0, 0.25, t));
    if (t < 0.5) return mix(C2, C3, smoothstep(0.25, 0.5, t));
    if (t < 0.75) return mix(C3, C4, smoothstep(0.5, 0.75, t));
    return mix(C4, C5, smoothstep(0.75, 1.0, t));
  }

  void main() {
    vec3 p = position;
    float colorPow = 2.0;
    float colorOffset = 0.5;
    float t = intensity;
    float texIdx = floor(batchId / 4.0);
    int texComponent = int(mod(batchId, 4.0));
    vec2 texCoord = vec2(
      mod(texIdx, textureSize) / (textureSize - 1.0),
      floor(texIdx / textureSize) / (textureSize - 1.0)
    );

    vec4 animationDataPx = texture2D(animationStartTexture, texCoord);

    // an annoying limitation of GLSL 1 (WebGL1) is that you cannot index into a vector
    // with a variable - only a constant
    float animationStart;
    if (texComponent == 0) {
      animationStart = animationDataPx.x;
    } else if (texComponent == 1) {
      animationStart = animationDataPx.y;
    } else if (texComponent == 2) {
      animationStart = animationDataPx.z;
    } else {
      animationStart = animationDataPx.w;
    }

    float animationDurationMs = 3000.0;
    float animationT = clamp((time - animationStart) / animationDurationMs, 0.0, 1.0);
    // apply easing
    animationT = 1.0 - pow(1.0 - animationT, 4.0);
    // if animationStart is 0.0, then zero out animationT
    animationT *= float(bool(animationStart));
    // have the points animate up into position slightly
    p.z -= 50.0 * (1.0 - animationT);

    vec3 c = getColorFromPalette(pow(t + colorOffset, colorPow));
    // points that are closer to the ground should be darker
    float colorMult = 0.05 + smoothstep(fadeHeightEnd, fadeHeightStart, p.z);
    c *= colorMult;
    color = vec4(c, animationT);

    // get the position of the point with respect to the camera
    vec4 translatedPosition = view * vec4(p, 1);
    float distToCamera = length(translatedPosition);
    float sizeT = 1.0 - pow(smoothstep(20.0, 2200.0, distToCamera), 0.5);
    float size = mix(1.0, 7.0, sizeT);
    float hide = step(fadeHeightEnd + 1.0, p.z) * (animationT * 0.5 + 0.5);
    gl_PointSize = size * hide;
    gl_Position = projection * translatedPosition * hide;
  }
  `

  const fs = `
  precision highp float;
  varying vec4 color;
  void main() {
    gl_FragColor = color;
  }
  `

  gl.clearColor(0.11, 0.12, 0.13, 1)
  // this isn't perfectly correct since we have blending turned on, but once all the data is
  // loaded, there are no transparent pixels anymore, and the performance win from depth testing
  // is too good to turn off
  gl.enable(gl.DEPTH_TEST)
  gl.enable(gl.BLEND)
  gl.blendEquation(gl.FUNC_ADD)
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE)

  const program = linkProgram(gl, vs, fs)
  gl.useProgram(program)

  const batchIdsBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, batchIdsBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, batchIds, gl.STATIC_DRAW)
  const batchIdsAttributeLocation = gl.getAttribLocation(program, 'batchId')
  gl.enableVertexAttribArray(batchIdsAttributeLocation)
  gl.vertexAttribPointer(batchIdsAttributeLocation, 1, gl.UNSIGNED_BYTE, false, 1, 0)

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  const positionAttributeLocation = gl.getAttribLocation(program, 'position')
  gl.enableVertexAttribArray(positionAttributeLocation)
  gl.vertexAttribPointer(positionAttributeLocation, 3, gl.UNSIGNED_SHORT, false, 8, 0)

  const intensityAttributeLocation = gl.getAttribLocation(program, 'intensity')
  gl.enableVertexAttribArray(intensityAttributeLocation)
  gl.vertexAttribPointer(intensityAttributeLocation, 1, gl.UNSIGNED_SHORT, true, 8, 6)

  const viewUniform = gl.getUniformLocation(program, 'view')
  const projectionUniform = gl.getUniformLocation(program, 'projection')
  const fadeHeightStartUniform = gl.getUniformLocation(program, 'fadeHeightStart')
  const fadeHeighEndUniform = gl.getUniformLocation(program, 'fadeHeightEnd')
  const textureSizeUniform = gl.getUniformLocation(program, 'textureSize')
  const timeUniform = gl.getUniformLocation(program, 'time')
  const animationStartTextureUniform = gl.getUniformLocation(program, 'animationStartTexture')

  return function render(renderState: { matrix: number[] }) {
    const { matrix } = renderState
    const time = Math.floor(performance.now())

    gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT)
    // TODO: pass in width and height here to allow for dynamic resizing
    const width = gl.drawingBufferWidth
    const height = gl.drawingBufferHeight
    gl.viewport(0, 0, width, height)

    const projection = mat4.perspective(new Float32Array(16), Math.PI / 4, width / height, 1, 1000000)

    gl.bindTexture(gl.TEXTURE_2D, animationTexture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    gl.uniformMatrix4fv(viewUniform, false, matrix)
    gl.uniformMatrix4fv(projectionUniform, false, projection)
    // TODO: have these controlled by UI sliders?
    gl.uniform1f(fadeHeightStartUniform, minZ + config.fadeHeightOffsetRange[1])
    gl.uniform1f(fadeHeighEndUniform, minZ + config.fadeHeightOffsetRange[0])
    gl.uniform1f(textureSizeUniform, animationTextureSize)
    gl.uniform1f(timeUniform, time)
    gl.uniform1i(animationStartTextureUniform, 0)

    gl.drawArrays(gl.POINTS, 0, getCurrentPointCount())
  }
}

async function getLidarStreamer(gl: WebGLRenderingContext, url: string) {
  const startTime = performance.now()
  const response = await fetch(url)

  if (!response.body) {
    throw new Error('Unable to fetch lidar data. No response.body.')
  }

  const littleEndian = isLittleEndian()

  /*
  Binary Data format:
    pointCount - uint32
    xOffset, yOffset, zOffset - int32s
    pt1 xDelta, yDelta, zDelta - uint16s
    pt1 intensity - uint16
    pt2...
  */
  const reader = response.body.getReader()

  const result = await reader.read()
  if (result.done || !result.value) throw new Error('Unable to fetch lidar data. Stream completed before any data was received.')
  const dataview = new DataView(result.value.buffer)
  const pointCount = dataview.getUint32(0, littleEndian)
  const offset = [
    dataview.getInt32(4, littleEndian),
    dataview.getInt32(8, littleEndian),
    dataview.getInt32(12, littleEndian)
  ]

  console.log({ pointCount, offset })

  const pointSizeInBytes = 4 * 2 // each point has 4 uint16 values
  const lidarData = new Uint8Array(pointCount * pointSizeInBytes)
  const initialData = new Uint8Array(result.value.buffer, 16)
  lidarData.set(initialData)

  let i = initialData.length
  let currentPointCount = Math.floor(i / pointSizeInBytes)

  const buffer = gl.createBuffer()
  if (!buffer) throw new Error('Could not create WebGL buffer')
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, lidarData, gl.DYNAMIC_DRAW)

  const textureSize = 8 // needs to be 8x8 texture in order to have fewer than 256 pointers (so we can use uint8s for pointers)
  const texturePxCount = textureSize * textureSize
  const batchCount = 4 * texturePxCount // 4 slots per pixel
  const pointBatchSize = Math.ceil(pointCount / batchCount)
  const animationData = new Float32Array(texturePxCount * 4)
  const batchIds = new Uint8Array(pointCount)
  for (let j = 0; j < batchIds.length; j++) {
    const batchId = Math.floor(j / pointBatchSize)
    batchIds[j] = batchId
  }

  const animationTexture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, animationTexture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, textureSize, textureSize, 0, gl.RGBA, gl.FLOAT, animationData)

  setTimeout(async function loadChunk() {
    let chunks = 1
    while (true) {
      const result = await reader.read()
      if (result.done) {
        console.log(`finished loading data in ${chunks} chunks. time(ms):`, performance.now() - startTime)
        return
      }
      chunks += 1
      // this should always have a value, but this check will satisfy typescript
      if (result.value) {
        const prevCompletedBatches = Math.floor(currentPointCount / pointBatchSize)
        gl.bufferSubData(gl.ARRAY_BUFFER, i, result.value)
        i += result.value.length
        currentPointCount = Math.floor(i / pointSizeInBytes)
        const curCompletedBatches = Math.floor(currentPointCount / pointBatchSize)
        const curTime = performance.now()
        for (let k = prevCompletedBatches; k < curCompletedBatches; k++) {
          animationData[k] = curTime
        }
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, textureSize, textureSize, 0, gl.RGBA, gl.FLOAT, animationData)
      }
    }
  }, 0)

  return {
    offset,
    pointCount,
    getCurrentPointCount: () => currentPointCount,
    buffer,
    animationTextureSize: textureSize,
    batchIds,
    animationTexture
  }
}

function isLittleEndian () {
  const buffer = new ArrayBuffer(2)
  new DataView(buffer).setInt16(0, 256, true /* littleEndian */)
  // Int16Array uses the platform's endianness.
  return new Int16Array(buffer)[0] === 256
}

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)

  if (!shader) {
    throw new Error('Could not create shader.')
  }

  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
  if (!success) {
    const err = gl.getShaderInfoLog(shader)
    throw new Error(`Shader error: ${err}`)
  }

  return shader
}

function linkProgram(gl: WebGLRenderingContext, vertexSource: string, fragmentSource: string) {
  const program = gl.createProgram()
  if (!program) {
    throw new Error('Could not create program')
  }

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource)
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource)

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  const success = gl.getProgramParameter(program, gl.LINK_STATUS)
  if (!success) {
    const err = gl.getProgramInfoLog(program)
    throw new Error(`Link error: ${err}`)
  }

  return program
}
