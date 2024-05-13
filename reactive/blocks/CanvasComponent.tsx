import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { useEventListener } from '../../src/dom'
import pick from 'lodash/pick'

export const extractCanvasProps = (
  props: CanvasComponentProps & Record<string, any>
): CanvasComponentProps => {
  return {
    resize: true,
    ...pick(
      props,
      'className',
      'width',
      'height',
      'id',
      'resize',
      'hidden',
      'webgl'
    )
  }
}

const CanvasComponent = forwardRef<HTMLCanvasElement, CanvasComponentProps>(
  (props, ref) => {
    const innerRef = useRef<HTMLCanvasElement>(
      props.hidden ? document.createElement('canvas') : null!
    )
    if (props.hidden) {
      innerRef.current.height = props.height ?? 1080
      innerRef.current.width = props.width ?? 1080
    }
    useImperativeHandle(ref, () => innerRef.current)
    const resizeCanvas = () => {
      const { width, height } = innerRef.current.getBoundingClientRect()
      innerRef.current.width = width
      innerRef.current.height = height
      if (props.webgl) {
        innerRef.current
          .getContext('webgl2')!
          .viewport(0, 0, innerRef.current.width, innerRef.current.height)
      }
    }
    useEventListener('resize', () => {
      if (!props.resize || props.hidden) return
      console.log('resizing')
      resizeCanvas()
    })
    useEffect(() => {
      if (!props.resize || props.hidden) return
      resizeCanvas()
    }, [])

    return (
      <>
        {!props.hidden && (
          <canvas
            ref={innerRef}
            className={props.className ?? undefined}
            id={props.id}
            height={props.height}
            width={props.width}></canvas>
        )}
      </>
    )
  }
)

export default CanvasComponent
