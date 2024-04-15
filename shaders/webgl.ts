import * as twgl from 'twgl.js'
import defaultVertex from './default.vert'

export function layer(gl: WebGL2RenderingContext, fragShader: string) {
  const buffer = twgl.createBufferInfoFromArrays(gl, {
    position: {
      numComponents: 2,
      data: [1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1, 1, 1, -1, -1, -1]
    }
  })

  const program = twgl.createProgramInfo(gl, [defaultVertex, fragShader])
  const drawing = twgl.createVertexArrayInfo(gl, program, buffer)

  return { geometry: drawing, material: program }
}

export function drawShape(
  gl: WebGL2RenderingContext,
  {
    material,
    geometry
  }: { material: twgl.ProgramInfo; geometry: twgl.VertexArrayInfo }
) {
  gl.useProgram(material.program)
  twgl.setBuffersAndAttributes(gl, material, geometry)
  twgl.drawBufferInfo(gl, geometry, gl.TRIANGLES)
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
