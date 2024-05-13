import WebAudioRenderer from '@elemaudio/web-renderer'
import { el } from '@elemaudio/core'
import { ChildComponent } from '../blocks/ParentChildComponents'

const Elementary = <InternalProps,>(
  props: ChildProps<
    Parameters<WebAudioRenderer['initialize']>[1],
    { node: AudioWorkletNode; core: WebAudioRenderer; el: typeof el },
    AudioContext,
    InternalProps
  >
) => (
  <ChildComponent
    options={props}
    getSelf={async (options, context) => {
      const core = new WebAudioRenderer()
      let node = await core.initialize(context, options)
      return { node, core, el }
    }}
  />
)

export default Elementary
