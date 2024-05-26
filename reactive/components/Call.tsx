import { FrameComponent } from '../blocks/ParentChildComponents'
import { omit } from 'lodash'

const Call = <K,>(props: ParentProps<{ options: K }, K>) => (
  <FrameComponent
    options={omit(props, 'children')}
    getSelf={(options) => {
      return options as K
    }}
  >
    {props.children}
  </FrameComponent>
)
export default Call
