import * as THREE from 'three';
import { Mesh, PerspectiveCamera, Scene } from 'three';

export default function createRenderer(context: WebGLRenderingContext) {
  const renderer = new THREE.WebGLRenderer({ context, canvas: context.canvas });
  renderer.setClearColor(0x000000, 1);

  const scene = new Scene();
  const camera = new PerspectiveCamera(75, 1.0, 0.1, 1000);

  const geometry = new THREE.BoxGeometry(2, 2, 2);
  const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
  const cube = new Mesh(geometry, material);

  const light = new THREE.PointLight(0xffffff, 1, 100);
  light.position.set(0, 0, 9);
  scene.add(light);
  scene.add(cube);

  camera.position.z = 5;

  return function render(renderProps: { x: number, y: number }, state: {xRotation: number, yRotation: number}) {
    if (state.xRotation === undefined) {
      state.xRotation = 0;
    }
    if (state.yRotation === undefined) {
      state.yRotation = 0;
    }

    state.xRotation += 0.01;
    state.yRotation += 0.01;

    cube.rotation.x = state.xRotation;
    cube.rotation.y = state.yRotation;

    light.position.x = 10 * renderProps.x;
    light.position.y = 10 * renderProps.y;

    renderer.render(scene, camera);
  }
}
