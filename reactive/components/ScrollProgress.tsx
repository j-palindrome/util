import { FrameComponent } from '../blocks/ParentChildComponents'
import { useScroll } from 'framer-motion'
import { omit } from 'lodash'

const ScrollProgress = <InternalProps,>(
  props: ParentProps<Parameters<typeof useScroll>[0], ReturnType<typeof useScroll>, InternalProps>
) => {
  const progress = useScroll(props)
  return (
    <FrameComponent
      options={omit(props, 'children')}
      getSelf={() => {
        return progress
      }}
    >
      {props.children}
    </FrameComponent>
  )
}
export default ScrollProgress
