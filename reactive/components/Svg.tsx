import { FrameComponent } from 'blocks/ParentChildComponents'
import { useRef } from 'react'

const Svg = (
  props: ParentProps<
    React.PropsWithChildren & {
      className?: string
      width?: number
      height?: number
      viewBox?: string
      hidden?: boolean
    },
    SVGSVGElement
  >
) => {
  const frame = useRef<SVGSVGElement>(null!)
  return (
    <>
      <FrameComponent
        options={props}
        getSelf={async () => {
          return frame.current
        }}
      />
      <div className={`h-full w-full ${props.className}`}>
        <svg
          preserveAspectRatio="none"
          ref={frame}
          display={props.hidden ? 'none' : ''}
          className={`h-full w-full `}
          width={props.width ?? 1}
          height={props.height ?? 1}
          viewBox={props.viewBox ?? `0 0 ${props.width ?? 1} ${props.height ?? 1}`}
        >
          {props.children}
        </svg>
      </div>
    </>
  )
}

export default Svg
