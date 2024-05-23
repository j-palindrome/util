import CanvasComponent, { extractCanvasProps } from '../blocks/CanvasComponent'
import { FrameComponent } from '../blocks/ParentChildComponents'
import { omit } from 'lodash'
import { useRef } from 'react'
import regl from 'regl'
const Regl = <InternalProps,>(
  props: ParentProps<
    CanvasComponentProps & {
      options?: regl.InitializationOptions
    },
    { gl: WebGL2RenderingContext; regl: regl.Regl },
    InternalProps
  >
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null!)
  return (
    <>
      <CanvasComponent
        ref={canvasRef}
        {...extractCanvasProps({ ...props, type: 'webgl2' })}
        webgl
      />
      <FrameComponent
        options={omit(props, 'children')}
        getSelf={(options) => {
          const gl = canvasRef.current.getContext('webgl2')!
          return {
            gl,
            regl: regl({ gl, ...options.options })
          }
        }}
        cleanupSelf={(self) => self.regl.destroy()}
      >
        {props.children}
      </FrameComponent>
    </>
  )
}

export default Regl
