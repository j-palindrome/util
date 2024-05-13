import { FrameComponent } from '../blocks/ParentChildComponents'
import { omit } from 'lodash'
import { useRef } from 'react'

const CameraInput = <InternalProps,>(
  props: ParentProps<
    React.PropsWithChildren & {
      width: number
      height: number
      hidden?: boolean
    },
    HTMLVideoElement,
    InternalProps
  >
) => {
  props = { hidden: true, ...props }
  const videoRef = useRef<HTMLVideoElement>(
    props.hidden === false ? null! : document.createElement('video')
  )
  return (
    <>
      {!props.hidden && (
        <video ref={videoRef} height={props.height} width={props.width} />
      )}
      <FrameComponent
        options={omit(props, 'children')}
        children={props.children}
        getSelf={async options => {
          videoRef.current.height = props.height
          videoRef.current.width = props.width
          navigator.mediaDevices
            .getUserMedia({ video: true })
            .then(localMediaStream => {
              videoRef.current.srcObject = localMediaStream
            })
          await videoRef.current.play()
          return videoRef.current
        }}
        cleanupSelf={self => self.remove()}
      />
    </>
  )
}
export default CameraInput
