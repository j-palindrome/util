import CanvasComponent, { extractCanvasProps } from '../blocks/CanvasComponent'
import {
  ChildComponent,
  FrameComponent,
  defineChildComponent
} from '../blocks/ParentChildComponents'
import { omit, range } from 'lodash'
import { useRef } from 'react'
import * as twgl from 'twgl.js'
import { Layer as LayerInstance, assembleAttributes } from '../../src/layer'
import {
  defaultFragColor,
  defaultVert2D,
  defaultVert2DNoResolution
} from '../../src/shaders/utilities'
import { cubicBezier, cubicBezierTangent } from '../../src/curve'

const CanvasGL = (
  props: ParentProps<
    Omit<CanvasComponentProps, 'type'> & {
      glOptions?: WebGLContextAttributes
    },
    WebGL2RenderingContext
  >
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null!)
  return (
    <>
      <CanvasComponent ref={canvasRef} {...extractCanvasProps(props)} webgl />
      <FrameComponent
        options={omit(props, 'children')}
        getSelf={(options) => {
          const gl = canvasRef.current.getContext('webgl2', options.glOptions)!
          gl.enable(gl.BLEND)
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
          return gl
        }}
      >
        {props.children}
      </FrameComponent>
    </>
  )
}
export default CanvasGL

export const Framebuffer = defineChildComponent(
  (
    options: {
      attachments?: Parameters<(typeof twgl)['createFramebufferInfo']>[1]
      width?: number
      height?: number
    },
    context: WebGL2RenderingContext
  ) => {
    const framebuffer = twgl.createFramebufferInfo(
      context,
      options.attachments ?? [{}],
      options.width ?? context.drawingBufferWidth,
      options.height ?? context.drawingBufferHeight
    )
    return framebuffer
  },
  (self, gl) => {
    twgl.bindFramebufferInfo(gl, self)
  }
)

export const Texture = defineChildComponent(
  (
    options: {
      options?: (gl: WebGL2RenderingContext) => twgl.TextureOptions
      width?: number
      height?: number
    },
    gl: WebGL2RenderingContext
  ) => {
    const texOptions = options.options ? options.options(gl) : undefined
    const texture = twgl.createTexture(gl, {
      width: options.width ?? gl.drawingBufferWidth,
      height: options.height ?? gl.drawingBufferHeight,
      ...texOptions
    })
    return texture
  }
)

export const Mesh = defineChildComponent(
  (
    options: Omit<ConstructorParameters<typeof LayerInstance>[0], 'gl'>,
    context: WebGL2RenderingContext
  ) => {
    return new LayerInstance({ ...options, gl: context })
  },
  (self, frame, options) => {
    self.draw()
  }
)

/**
 * Returns a Mesh with positions at each of the four corners, only requiring code for a fragment shader.
 */
export const Plane = defineChildComponent(
  (
    options: Omit<
      ConstructorParameters<typeof LayerInstance>[0],
      'gl' | 'attributes' | 'vertexShader'
    > & {
      xywh?: [number, number, number, number]
    },
    context: WebGL2RenderingContext
  ) => {
    const xywh = options.xywh
    const data = xywh
      ? [
          xywh[0],
          xywh[1],
          xywh[0] + xywh[2],
          xywh[1],
          xywh[0],
          xywh[1] - xywh[3],
          xywh[0] + xywh[2],
          xywh[1] - xywh[3]
        ]
      : [-1, 1, 1, 1, -1, -1, 1, -1]

    return new LayerInstance({
      ...options,
      attributes: {
        position: {
          data,
          numComponents: 2
        }
      },
      uniforms: {
        resolution: [context.drawingBufferWidth, context.drawingBufferHeight]
      },
      vertexShader: defaultVert2DNoResolution,
      fragmentShader: `in vec2 uv;\nuniform vec2 resolution;\n` + options.fragmentShader,
      drawMode: 'triangle strip',
      gl: context
    })
  }
)

export const VideoPlane = defineChildComponent(
  (
    options: { xywh?: [number, number, number, number]; source: WebGLTexture | string },
    context: WebGL2RenderingContext
  ) => {
    const xywh = options.xywh
    const data = xywh
      ? [
          xywh[0],
          xywh[1],
          xywh[0] + xywh[2],
          xywh[1],
          xywh[0],
          xywh[1] - xywh[3],
          xywh[0] + xywh[2],
          xywh[1] - xywh[3]
        ]
      : [-1, 1, 1, 1, -1, -1, 1, -1]
    const layer = new LayerInstance({
      ...options,
      attributes: {
        position: {
          data,
          numComponents: 2
        }
      },
      uniforms: {
        resolution: [context.drawingBufferWidth, context.drawingBufferHeight]
      },
      vertexShader: defaultVert2DNoResolution,
      fragmentShader: /*glsl*/ `
        in vec2 uv;
        uniform vec2 resolution;
        uniform sampler2D source;
        void main() {
          fragColor = texture(source, uv);
        }`,
      drawMode: 'triangle strip',
      gl: context
    })
    return layer
  },
  (self, frame, context, options) => {
    self.draw({
      source: typeof options.source === 'string' ? context.elements[options.source] : options.source
    })
  }
)

type Point = [number, number]
export const AttribCurve = defineChildComponent(
  (
    options: {
      curves: {
        points: { points: [Point, Point, Point]; width: number }[]
        end: { point: Point; width: number }
      }[]
      subdivisions: number
    },
    gl: WebGL2RenderingContext
  ) => {
    let startIndex = 0
    const indices: number[] = []
    const attributes = assembleAttributes(
      {
        p0: {
          numComponents: 2
        },
        p1: { numComponents: 2 },
        p2: { numComponents: 2 },
        p3: { numComponents: 2 },
        w0: { numComponents: 1 },
        w1: { numComponents: 1 },
        direction: { numComponents: 1 },
        t: { numComponents: 1 },
        indices: {}
      },
      range(options.curves.length).flatMap((index) => {
        let thisIndices: number[] = []
        for (
          let i = startIndex;
          i < options.curves[index].points.length * options.subdivisions + startIndex - 2;
          i += 2
        ) {
          indices.push(i, i + 1, i + 2, i + 1, i + 2, i + 3)
        }
        return range(options.curves[index].points.length).flatMap((i) => {
          const thisPoint = i
          const fullPoint = {
            p0: options.curves[index].points[thisPoint].points[0],
            p1: options.curves[index].points[thisPoint].points[1],
            p2: options.curves[index].points[thisPoint].points[2],
            p3:
              options.curves[index].points[thisPoint + 1]?.points[0] ??
              options.curves[index].end.point,
            w0: options.curves[index].points[thisPoint].width,
            w1: (options.curves[index].points[thisPoint + 1] ?? options.curves[index].end).width
          }
          return range(options.subdivisions).flatMap((t) => {
            return [
              { ...fullPoint, t: t / options.subdivisions, direction: 1 },
              { ...fullPoint, t: t / options.subdivisions, direction: -1 }
            ]
          })
        })
      })
    )
    attributes.indices = indices
    console.log(attributes)

    return new LayerInstance({
      gl,
      attributes,
      vertexShader: /*glsl*/ `
        in vec2 p0;
        in vec2 p1;
        in vec2 p2;
        in vec2 p3;
        in float t;
        in float w0;
        in float w1;
        in float direction;
        out vec2 vTest;

        ${cubicBezier}
        ${cubicBezierTangent}
        
        void main() {
          vec2 pos = cubicBezier(t, p0, p1, p2, p3);
          float width = w0 + (w1 - w0) * t;
          vec2 tangent = cubicBezierTangent(t, p0, p1, p2, p3);
          vTest = tangent;
          gl_Position = vec4(pos + tangent * direction * width, 0, 1);
          // gl_Position = vec4(p0, 0, 1);
        }
      `,
      fragmentShader: /*glsl*/ `
      in vec2 vTest;
      void main() {
        fragColor = vec4(vTest, 1.0, 1.0);
      }`
    })
  },
  (self) => self.draw()
)
// /**
//  * Returns a Layer alowing a fragment shader from a `sampler2D canvas` which is set to the canvas on each draw call.
//  */
// export const GLFilter = (
//   props: ChildProps<
//     Omit<ConstructorParameters<typeof LayerInstance>[0], 'gl' | 'attributes' | 'vertexShader'>,
//     { filter: (uniforms?: Record<string, any>) => void },
//     WebGL2RenderingContext,
//
//   >
// ) => (
//   <ChildComponent
//     options={props}
//     getSelf={async (options, context) => {
//       const texture = context.createTexture()!
//       twgl.resizeTexture(context, texture, {
//         width: context.drawingBufferWidth,
//         height: context.drawingBufferHeight
//       })
//       const layer = new LayerInstance({
//         ...options,
//         attributes: {
//           position: {
//             data: [-1, 1, 1, 1, -1, -1, 1, -1],
//             numComponents: 2
//           }
//         },
//         uniforms: {
//           resolution: [context.drawingBufferWidth, context.drawingBufferHeight]
//         },
//         vertexShader: defaultVert2D,
//         fragmentShader: `uniform sampler2D canvas;\nin vec2 uv;\n` + options.fragmentShader,
//         drawMode: 'triangle strip',
//         gl: context
//       })

//       return {
//         filter: (uniforms) => {
//           twgl.resizeTexture(context, texture, {
//             width: context.drawingBufferWidth,
//             height: context.drawingBufferHeight
//           })
//           twgl.setTextureFromElement(context, texture, context.canvas as HTMLCanvasElement)
//           layer.draw({ ...uniforms, canvas: texture })
//         }
//       }
//     }}
//   />
// )
