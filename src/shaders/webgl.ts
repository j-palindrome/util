import * as twgl from 'twgl.js'
import defaultVertex from './default.vert?raw'

export class Layer {
  gl: WebGL2RenderingContext
  program: twgl.ProgramInfo
  vertexArray: twgl.VertexArrayInfo
  drawMode: number

  lastDraw: number
  private buffers: twgl.Arrays

  constructor(
    buffers: twgl.Arrays,
    vertexShader: string,
    fragmentShader: string,
    {
      drawMode,
      gl,
      useDefaults = true
    }: {
      drawMode: number
      gl: WebGL2RenderingContext
      useDefaults?: boolean
      frameRate?: number
    }
  ) {
    if (useDefaults) {
      vertexShader = `#version 300 es\nprecision highp float;\n` + vertexShader
      fragmentShader =
        `#version 300 es\nprecision highp float;\nout vec4 fragColor;\n` + fragmentShader
    }
    this.gl = gl
    this.drawMode = drawMode
    this.program = twgl.createProgramInfo(gl, [vertexShader, fragmentShader])
    this.vertexArray = twgl.createVertexArrayInfo(
      gl,
      this.program,
      twgl.createBufferInfoFromArrays(gl, buffers)
    )
    this.buffers = buffers
    this.lastDraw = 0
  }

  update(buffers: twgl.Arrays) {
    this.buffers = { ...this.buffers, ...buffers }
    this.vertexArray = twgl.createVertexArrayInfo(
      this.gl,
      this.program,
      twgl.createBufferInfoFromArrays(this.gl, this.buffers)
    )
  }

  draw(time: number, uniforms?: Record<string, any>) {
    this.lastDraw = time
    this.gl.useProgram(this.program.program)
    if (uniforms) {
      twgl.setUniforms(this.program, uniforms)
    }
    twgl.setBuffersAndAttributes(this.gl, this.program, this.vertexArray)
    twgl.drawBufferInfo(this.gl, this.vertexArray, this.drawMode)
  }
}

export function resetGl(gl: WebGL2RenderingContext) {
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
  gl.enable(gl.BLEND)
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
  gl.bindBuffer(gl.ARRAY_BUFFER, null)
  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
}
