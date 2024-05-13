import CanvasComponent, { extractCanvasProps } from 'blocks/CanvasComponent'
import { FrameComponent } from 'components'
import { omit } from 'lodash'
import type p5 from 'p5'
import { useRef } from 'react'

const Processing = <InternalProps,>(
  props: ParentProps<
    CanvasComponentProps & {
      type: 'p2d' | 'webgl'
    },
    p5,
    InternalProps
  >
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null!)
  return (
    <>
      <CanvasComponent
        ref={canvasRef}
        {...extractCanvasProps(props)}
        webgl={props.type === 'webgl'}
      />
      <FrameComponent
        options={omit(props, 'children')}
        children={props.children}
        getSelf={async options => {
          const p5 = await import('p5')

          return new p5.default((p: p5) => {
            // disable draw and setup, they get handled in the previous contexts
            p.setup = () => {
              p.noLoop()
              p.createCanvas(
                canvasRef.current.width,
                canvasRef.current.height,
                options.type,
                canvasRef.current
              )
            }
            p.windowResized = () => {
              p.resizeCanvas(canvasRef.current.width, canvasRef.current.height)
            }
          })
        }}
      />
    </>
  )
}

export default Processing
