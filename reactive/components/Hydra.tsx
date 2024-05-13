import CanvasComponent, { extractCanvasProps } from 'blocks/CanvasComponent'
import { FrameComponent } from 'components'
import HydraInstance, { HydraSynth } from 'hydra-synth'
import { omit } from 'lodash'
import { useRef } from 'react'

const Hydra = <InternalProps,>(
  props: ParentProps<
    CanvasComponentProps &
      ConstructorParameters<typeof HydraInstance>[0] & {
        hideCanvas?: true
      },
    HydraSynth,
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
        getSelf={async options => {
          const { default: HydraInstance } = await import('hydra-synth')
          const instance = new HydraInstance({
            makeGlobal: false,
            autoLoop: false,
            detectAudio: true,
            width: canvasRef.current.width,
            height: canvasRef.current.height,
            canvas: canvasRef.current,
            ...options
          })
          const fakeCanvas = document.querySelector(
            '[style="width: 100px; height: 80px; position: absolute; right: 0px; bottom: 0px;"]'
          )
          fakeCanvas?.remove()

          return instance.synth
        }}></FrameComponent>
    </>
  )
}

export default Hydra
