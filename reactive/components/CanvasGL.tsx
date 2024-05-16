import CanvasComponent, { extractCanvasProps } from '../blocks/CanvasComponent'
import { ChildComponent, FrameComponent } from '../blocks/ParentChildComponents'
import { omit } from 'lodash'
import { useRef } from 'react'
import * as twgl from 'twgl.js'
import { Layer as LayerInstance } from '../../src/layer'
import { defaultVert2D } from '../../src/shaders/utilities'

const CanvasGL = <InternalProps,>(
  props: ParentProps<
    Omit<CanvasComponentProps, 'type'> & {
      glOptions?: WebGLContextAttributes
    },
    WebGL2RenderingContext,
    InternalProps
  >
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null!)
  return (
    <>
      <CanvasComponent ref={canvasRef} {...extractCanvasProps(props)} webgl />
      <FrameComponent
        options={omit(props, 'children')}
        children={props.children}
        getSelf={options => {
          const gl = canvasRef.current.getContext('webgl2', options.glOptions)!
          gl.enable(gl.BLEND)
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
          return gl
        }}
      />
    </>
  )
}
export default CanvasGL

export const Texture = <InternalProps,>(
  props: ChildProps<
    Parameters<(typeof twgl)['createTexture']>[1],
    WebGLTexture,
    WebGL2RenderingContext,
    InternalProps
  >
) => (
  <ChildComponent
    options={props}
    getSelf={(options, context) => {
      return twgl.createTexture(context, {
        height: context.canvas.height,
        width: context.canvas.width,
        ...options
      })
    }}
  />
)
export const Mesh = <InternalProps,>(
  props: ChildProps<
    Omit<ConstructorParameters<typeof LayerInstance>[0], 'gl'>,
    LayerInstance,
    WebGL2RenderingContext,
    InternalProps
  >
) => (
  <ChildComponent
    options={props}
    getSelf={async (options, context) => {
      return new LayerInstance({ ...options, gl: context })
    }}
  />
)
/**
 * Returns a Mesh with positions at each of the four corners, only requiring code for a fragment shader.
 */
export const Plane = <InternalProps,>(
  props: ChildProps<
    Omit<
      ConstructorParameters<typeof LayerInstance>[0],
      'gl' | 'attributes' | 'vertexShader'
    >,
    LayerInstance,
    WebGL2RenderingContext,
    InternalProps
  >
) => (
  <ChildComponent
    options={props}
    getSelf={async (options, context) => {
      return new LayerInstance({
        ...options,
        attributes: {
          position: {
            data: [-1, 1, 1, 1, -1, -1, 1, -1],
            numComponents: 2
          }
        },
        uniforms: {
          resolution: [context.drawingBufferWidth, context.drawingBufferHeight]
        },
        vertexShader: defaultVert2D,
        fragmentShader: `in vec2 uv;\n` + options.fragmentShader,
        drawMode: 'triangle strip',
        gl: context
      })
    }}
  />
)
/**
 * Returns a Layer alowing a fragment shader from a `sampler2D canvas` which is set to the canvas on each draw call.
 */
export const GLFilter = <InternalProps,>(
  props: ChildProps<
    Omit<
      ConstructorParameters<typeof LayerInstance>[0],
      'gl' | 'attributes' | 'vertexShader'
    >,
    { filter: (uniforms?: Record<string, any>) => void },
    WebGL2RenderingContext,
    InternalProps
  >
) => (
  <ChildComponent
    options={props}
    getSelf={async (options, context) => {
      const texture = context.createTexture()!
      twgl.resizeTexture(context, texture, {
        width: context.drawingBufferWidth,
        height: context.drawingBufferHeight
      })
      const layer = new LayerInstance({
        ...options,
        attributes: {
          position: {
            data: [-1, 1, 1, 1, -1, -1, 1, -1],
            numComponents: 2
          }
        },
        uniforms: {
          resolution: [context.drawingBufferWidth, context.drawingBufferHeight]
        },
        vertexShader: defaultVert2D,
        fragmentShader:
          `uniform sampler2D canvas;\nin vec2 uv;\n` + options.fragmentShader,
        drawMode: 'triangle strip',
        gl: context
      })

      return {
        filter: uniforms => {
          twgl.resizeTexture(context, texture, {
            width: context.drawingBufferWidth,
            height: context.drawingBufferHeight
          })
          twgl.setTextureFromElement(
            context,
            texture,
            context.canvas as HTMLCanvasElement
          )
          layer.draw({ ...uniforms, canvas: texture })
        }
      }
    }}
  />
)