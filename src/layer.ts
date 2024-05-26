import * as twgl from 'twgl.js'
import _ from 'lodash'

export const generateShape = (type: 'plane') => {
  switch (type) {
    case 'plane':
      return [-1, 1, -1, -1, 1, 1, 1, 1, -1, -1, 1, -1]
  }
}
export function assembleAttributes<K extends string[]>(
  template: Record<K[number], twgl.FullArraySpec>,
  attribs: Record<K[number], number | number[]>[]
) {
  const newTemplate: twgl.Arrays = {}
  for (let key of Object.keys(template)) {
    newTemplate[key] = {
      ...(template[key] as twgl.FullArraySpec),
      data: attribs.map((x) => x[key]).flat()
    }
  }
  return newTemplate
}
export class Layer {
  gl: WebGL2RenderingContext
  program: twgl.ProgramInfo
  vertexArray: twgl.VertexArrayInfo
  transformFeedback?: {
    feedbackVertexArray: twgl.VertexArrayInfo
    feedbackObjects: [WebGLTransformFeedback, WebGLTransformFeedback]
    feedbackToggle: boolean
  }
  drawMode: number
  uniforms?: Record<string, any>
  bufferInfo: twgl.BufferInfo

  lastDraw: number
  private attributes: twgl.Arrays

  constructor({
    attributes,
    vertexShader,
    fragmentShader,
    drawMode,
    gl,
    useDefaults = true,
    uniforms,
    transformFeedback
  }: {
    attributes: twgl.Arrays | ((time: number) => twgl.Arrays)
    vertexShader: string
    fragmentShader: string
    drawMode?: 'triangles' | 'points' | 'triangle strip' | 'triangle fan' | 'line strip' | 'lines'
    gl: WebGL2RenderingContext
    useDefaults?: boolean
    frameRate?: number
    uniforms?: Record<string, any>
    transformFeedback?: [string, string][]
  }) {
    if (useDefaults) {
      vertexShader = `#version 300 es\nprecision highp float;\n` + vertexShader
      fragmentShader =
        `#version 300 es\nprecision highp float;\nout vec4 fragColor;\n` + fragmentShader
    }

    this.gl = gl
    this.drawMode = drawMode
      ? {
          triangles: this.gl.TRIANGLES,
          points: this.gl.POINTS,
          'triangle strip': this.gl.TRIANGLE_STRIP,
          'triangle fan': this.gl.TRIANGLE_FAN,
          lines: this.gl.LINES,
          'line strip': this.gl.LINE_STRIP,
          'line loop': this.gl.LINE_LOOP
        }[drawMode]
      : this.gl.TRIANGLES
    this.program = twgl.createProgramInfo(
      gl,
      [vertexShader, fragmentShader],
      transformFeedback
        ? { transformFeedbackVaryings: transformFeedback.map((x) => x[0]) }
        : undefined
    )
    const thisAttributes = typeof attributes === 'function' ? attributes(0) : attributes
    this.bufferInfo = twgl.createBufferInfoFromArrays(gl, thisAttributes)

    this.vertexArray = twgl.createVertexArrayInfo(gl, this.program, this.bufferInfo)
    if (transformFeedback) {
      const feedbackAttributes = _.cloneDeep(thisAttributes)
      for (let [inKey, outKey] of transformFeedback) {
        delete feedbackAttributes[outKey]['data']
        feedbackAttributes[outKey]['buffer'] = this.bufferInfo.attribs![inKey].buffer
        feedbackAttributes[inKey]['buffer'] = this.bufferInfo.attribs![outKey].buffer
      }

      const feedbackBufferInfo = twgl.createBufferInfoFromArrays(gl, feedbackAttributes)
      const feedbackVertexArray = twgl.createVertexArrayInfo(gl, this.program, feedbackBufferInfo)

      this.transformFeedback = {
        feedbackVertexArray,
        feedbackObjects: [
          twgl.createTransformFeedback(this.gl, this.program, this.bufferInfo),
          twgl.createTransformFeedback(this.gl, this.program, feedbackBufferInfo)
        ],
        feedbackToggle: false
      }
    } else {
      this.vertexArray = twgl.createVertexArrayInfo(
        gl,
        this.program,
        twgl.createBufferInfoFromArrays(gl, thisAttributes)
      )
    }
    this.attributes = thisAttributes
    this.lastDraw = 0
    this.uniforms = uniforms
  }

  draw(uniforms?: Record<string, any>, attributes?: twgl.Arrays) {
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null)
    this.gl.useProgram(this.program.program)
    if (uniforms) {
      this.uniforms = { ...this.uniforms, ...uniforms }
    }
    if (attributes) {
      this.attributes = { ...this.attributes, ...attributes }
      this.vertexArray = twgl.createVertexArrayInfo(
        this.gl,
        this.program,
        twgl.createBufferInfoFromArrays(this.gl, this.attributes)
      )
      if (this.transformFeedback) {
        this.transformFeedback.feedbackVertexArray = twgl.createVertexArrayInfo(
          this.gl,
          this.program,
          twgl.createBufferInfoFromArrays(this.gl, this.attributes)
        )
      }
    }
    if (this.uniforms) {
      twgl.setUniforms(this.program, this.uniforms)
    }
    if (this.transformFeedback) {
      const feedback =
        this.transformFeedback.feedbackObjects[this.transformFeedback.feedbackToggle ? 1 : 0]
      const vertexArray = this.transformFeedback.feedbackToggle
        ? this.transformFeedback.feedbackVertexArray
        : this.vertexArray

      twgl.setBuffersAndAttributes(this.gl, this.program, vertexArray)

      this.gl.bindTransformFeedback(this.gl.TRANSFORM_FEEDBACK, feedback)
      this.gl.beginTransformFeedback(this.gl.POINTS)

      twgl.drawBufferInfo(this.gl, vertexArray, this.drawMode)

      this.gl.endTransformFeedback()
      this.gl.bindTransformFeedback(this.gl.TRANSFORM_FEEDBACK, null)

      this.transformFeedback.feedbackToggle = !this.transformFeedback.feedbackToggle
    } else {
      twgl.setBuffersAndAttributes(this.gl, this.program, this.vertexArray)
      twgl.drawBufferInfo(this.gl, this.vertexArray, this.drawMode)
    }
  }
}

export function resetGl(gl: WebGL2RenderingContext) {
  twgl.resizeCanvasToDisplaySize(gl.canvas as HTMLCanvasElement)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
  gl.enable(gl.BLEND)
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
  gl.bindBuffer(gl.ARRAY_BUFFER, null)
  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
}
