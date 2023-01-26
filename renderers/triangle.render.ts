const VERTEX_SHADER = `
uniform float time;
attribute vec2 position;


void main() {
  gl_Position = vec4(position.x, position.y, 0.5, 1.0);
}
`;

const FRAG_SHADER = `
precision mediump float;

void main() {
  gl_FragColor = vec4(0.3, 0.7, 0.4, 1.0);
}
`;

export default function createRenderer(gl: WebGLRenderingContext) {
  gl.clearColor(.05, .23, .3, 1);

  const triangleMesh = [
    -0.5, -.66,
    0.5, -.66,
    0, 0.5,
  ];

  const triangleBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleMesh), gl.STATIC_DRAW);

  const program = createProgram(gl, VERTEX_SHADER, FRAG_SHADER);
  const attrPosition = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(attrPosition);
  gl.useProgram(program);


  return function render(renderState: {}) {
    // draw to the whole canvas and clear to the background color
    gl.clear(gl.COLOR_BUFFER_BIT);
  
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
    gl.vertexAttribPointer(attrPosition, 2, gl.FLOAT, false, 4 * 2, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  
    gl.flush();  
  }
}

function createShader(gl: WebGLRenderingContext, source: string, type: number) {
  var shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  // report any errors from compiling the shader
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.log("error compiling " + (type == gl.VERTEX_SHADER ? "vertex" : "fragment") + " shader: " + gl.getShaderInfoLog(shader));
  }

  return shader;
}

function createProgram(gl: WebGLRenderingContext, vertexSource: string, fragmentSource: string) {
  var program = gl.createProgram()!;
  var vertexShader = createShader(gl, vertexSource, gl.VERTEX_SHADER);
  var fragmentShader = createShader(gl, fragmentSource, gl.FRAGMENT_SHADER);
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  return program;
}
