import createCameraControls from '3d-view-controls'

const CENTER = [1249.5, 1249.5, 800]
const EYE = [CENTER[0] - 2000, CENTER[1] - 2000, 2000]

export default function createCamera(canvas: HTMLElement) {
  const camera = createCameraControls(canvas, {
    eye: EYE,
    center: CENTER
  }) as any
  const tick = camera.tick
  camera.tick = function wrappedTick() {
    const result = tick.apply(camera)
    camera.up = [0, 0, 1]
    return result
  }
  const matrix = new Float32Array(16)
  camera.getMatrix = function() {
    matrix.set(camera.matrix)
    return matrix
  }
  return camera
}
