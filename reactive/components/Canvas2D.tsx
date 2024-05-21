import CanvasComponent, { extractCanvasProps } from '../blocks/CanvasComponent'
import { FrameComponent } from '../blocks/ParentChildComponents'
import { omit } from 'lodash'
import { useRef } from 'react'

const Canvas2D = <InternalProps,>(
  props: ParentProps<
    React.PropsWithChildren & CanvasComponentProps & { options?: CanvasRenderingContext2DSettings },
    CanvasRenderingContext2D,
    InternalProps
  >
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null!)
  return (
    <>
      <CanvasComponent ref={canvasRef} {...extractCanvasProps(props)} />
      <FrameComponent
        options={omit(props, 'children')}
        children={props.children}
        getSelf={(options) => {
          const gl = canvasRef.current.getContext('2d', props.options)!
          return gl
        }}
      />
    </>
  )
}
export default Canvas2D
