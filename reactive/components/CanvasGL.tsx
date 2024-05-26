import CanvasComponent, { extractCanvasProps } from '../blocks/CanvasComponent'
import {
  ChildComponent,
  FrameComponent,
  defineChildComponent
} from '../blocks/ParentChildComponents'
import _, { omit, range, sumBy } from 'lodash'
import { useRef } from 'react'
import * as twgl from 'twgl.js'
import { Layer as LayerInstance, assembleAttributes } from '../../src/layer'
import {
  defaultFragColor,
  defaultVert2D,
  defaultVert2DNoResolution
} from '../../src/shaders/utilities'
import { cubicBezier, cubicBezierNormal } from '../../src/curve'

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
type Curves = { start: Point; direction: Point; width: number }[][]
export const AttribCurve = defineChildComponent(
  (
    options: {
      curves?: Curves
      subdivisions: number
      fragmentShader: string
    },
    gl: WebGL2RenderingContext
  ) => {
    const generateAttributes = (curves: Curves) => {
      // 40.3 ms
      let startIndex = 0
      let indexIndex = 0
      const vertexNumber = _.sumBy(curves, (x) => (x.length - 1) * options.subdivisions * 2)
      const attributes = {
        p0: {
          numComponents: 2,
          data: new Float32Array(vertexNumber * 2)
        },
        thisControl: { numComponents: 2, data: new Float32Array(vertexNumber * 2) },
        nextControl: { numComponents: 2, data: new Float32Array(vertexNumber * 2) },
        p3: { numComponents: 2, data: new Float32Array(vertexNumber * 2) },
        w0: { numComponents: 1, data: new Float32Array(vertexNumber) },
        w1: { numComponents: 1, data: new Float32Array(vertexNumber) },
        direction: { numComponents: 1, data: new Float32Array(vertexNumber) },
        t: { numComponents: 1, data: new Float32Array(vertexNumber) },
        indices: {
          data: new Uint32Array(sumBy(curves, (x) => (x.length - 1) * options.subdivisions - 2) * 6)
        }
      }
      for (let index = 0; index < curves.length; index++) {
        for (
          let i = startIndex;
          i < (curves[index].length - 1) * options.subdivisions + startIndex - 2;
          i += 2
        ) {
          attributes.indices.data.set([i, i + 1, i + 2, i + 1, i + 2, i + 3], indexIndex)
          indexIndex += 6
        }
        for (let i = 0; i < curves[index].length - 1; i++) {
          const thisPoint = curves[index][i]
          const nextPoint = curves[index][i + 1]
          const fullPoint = {
            thisControl: thisPoint.direction,
            nextControl: nextPoint.direction,
            p0: thisPoint.start,
            p3: nextPoint.start,
            w0: thisPoint.width,
            w1: nextPoint.width
          }
          for (let t = 0; t < options.subdivisions; t++) {
            const thisT = t / options.subdivisions
            attributes.t.data.set([thisT, thisT], startIndex)
            attributes.thisControl.data.set(
              [...fullPoint.thisControl, ...fullPoint.thisControl],
              startIndex * 2
            )
            attributes.nextControl.data.set(
              [...fullPoint.nextControl, ...fullPoint.nextControl],
              startIndex * 2
            )
            attributes.p0.data.set([...fullPoint.p0, ...fullPoint.p0], startIndex * 2)
            attributes.p3.data.set([...fullPoint.p3, ...fullPoint.p3], startIndex * 2)
            attributes.w0.data.set([fullPoint.w0, fullPoint.w0], startIndex)
            attributes.w1.data.set([fullPoint.w1, fullPoint.w1], startIndex)
            attributes.direction.data.set([0, 1], startIndex)
            startIndex += 2
          }
        }
      }
      return attributes
      // 257.5 ms
      // let startIndex = 0
      // const indices: number[] = []
      // const attributes = assembleAttributes(
      //   {
      //     p0: {
      //       numComponents: 2
      //     },
      //     thisControl: { numComponents: 2 },
      //     nextControl: { numComponents: 2 },
      //     p3: { numComponents: 2 },
      //     w0: { numComponents: 1 },
      //     w1: { numComponents: 1 },
      //     direction: { numComponents: 1 },
      //     t: { numComponents: 1 },
      //     indices: {}
      //   },
      //   range(curves.length).flatMap((index) => {
      //     for (
      //       let i = startIndex;
      //       i < (curves[index].length - 1) * options.subdivisions + startIndex - 2;
      //       i += 2
      //     ) {
      //       indices.push(i, i + 1, i + 2, i + 1, i + 2, i + 3)
      //     }
      //     return range(curves[index].length - 1).flatMap((i) => {
      //       const thisPoint = curves[index][i]
      //       const nextPoint = curves[index][i + 1]
      //       const fullPoint = {
      //         thisControl: thisPoint.direction,
      //         nextControl: nextPoint.direction,
      //         p0: thisPoint.start,
      //         p3: nextPoint.start,
      //         w0: thisPoint.width,
      //         w1: nextPoint.width
      //       }
      //       return range(options.subdivisions).flatMap((t) => {
      //         return [
      //           { ...fullPoint, t: t / options.subdivisions, direction: 1 },
      //           { ...fullPoint, t: t / options.subdivisions, direction: 0 }
      //         ]
      //       })
      //     })
      //   })
      // )
      // attributes.indices = indices
    }

    const curve = new LayerInstance({
      gl,
      attributes: options.curves
        ? generateAttributes(options.curves)
        : {
            p0: {
              numComponents: 2
            },
            thisControl: { numComponents: 2 },
            nextControl: { numComponents: 2 },
            p3: { numComponents: 2 },
            w0: { numComponents: 1 },
            w1: { numComponents: 1 },
            direction: { numComponents: 1 },
            t: { numComponents: 1 },
            indices: { numComponents: 1 }
          },
      vertexShader: /*glsl*/ `
        in vec2 p0;
        in vec2 p3;
        in vec2 thisControl;
        in vec2 nextControl;
        in float t;
        in float w0;
        in float w1;
        in float direction;
        out vec2 uv;

        ${cubicBezier}
        ${cubicBezierNormal}
        
        void main() {
          vec2 p1 = p0 + thisControl;
          vec2 p2 = nextControl * -1.0 + p3;
          vec2 pos = cubicBezier(t, p0, p1, p2, p3);
          vec2 normal = cubicBezierNormal(t, p0, p1, p2, p3);
          vec2 nextNormal = cubicBezierNormal(min(t + 0.01, 1.0), p0, p1, p2, p3);
          
          float width = w0 + (w1 - w0) * t;
          
          float miter = length(cross(vec3(normal, 0.0), vec3(nextNormal, 0.0)));
          // gl_Position = vec4(pos + normal * direction * width, 0, 1);
          gl_Position = vec4(pos + normal * direction * width * (1.0 - miter), 0, 1);
        }
      `,
      fragmentShader: options.fragmentShader
    })
    return {
      draw: (curves?: Curves, uniforms?: Record<string, any>) =>
        curve.draw(uniforms, curves ? generateAttributes(curves) : undefined)
    }
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
