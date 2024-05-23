import { FrameComponent } from 'blocks/ParentChildComponents'
import { useRef } from 'react'

const Svg = <InternalProps,>(
  props: ParentProps<
    React.PropsWithChildren & {
      className?: string
      width?: number
      height?: number
      viewBox?: string
    },
    SVGSVGElement,
    InternalProps
  >
) => {
  const frame = useRef<SVGSVGElement>(null!)
  return (
    <>
      <svg
        preserveAspectRatio="none"
        ref={frame}
        className="h-full w-full"
        width={props.width ?? 1}
        height={props.height ?? 1}
        viewBox={props.viewBox ?? `0 0 ${props.width ?? 1} ${props.height ?? 1}`}
      >
        {props.children}
      </svg>
      <FrameComponent
        options={props}
        getSelf={async () => {
          return frame.current
        }}
      >
        {props.children}
      </FrameComponent>
    </>
  )
}

export default Svg
