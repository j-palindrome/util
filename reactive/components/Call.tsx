import { FrameComponent } from 'components'
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
