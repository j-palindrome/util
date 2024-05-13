import { FrameComponent } from '../blocks/ParentChildComponents'
import { omit } from 'lodash'

const Call = <InternalProps,>(props: ParentProps<{}, {}, InternalProps>) => (
  <FrameComponent
    options={omit(props, 'children')}
    children={props.children}
    getSelf={() => {
      return {}
    }}
  />
)
export default Call
