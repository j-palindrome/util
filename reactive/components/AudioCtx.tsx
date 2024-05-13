import { ChildComponent, FrameComponent } from 'components'
import { omit } from 'lodash'

const AudioCtx = <InternalProps,>(
  props: ParentProps<
    ConstructorParameters<typeof AudioContext>[0],
    AudioContext,
    InternalProps
  >
) => (
  <FrameComponent
    options={omit(props, 'children')}
    children={props.children}
    getSelf={(
      options?: ConstructorParameters<typeof AudioContext>[0] | undefined
    ) => new AudioContext(options)}
  />
)

export default AudioCtx

export const MicInput = <InternalProps,>(
  props: ChildProps<
    {},
    {
      input: MediaStreamAudioSourceNode
      gain: GainNode
      compressor: DynamicsCompressorNode
    },
    AudioContext,
    InternalProps
  >
) => (
  <ChildComponent
    options={props}
    getSelf={async (options, context) => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      })
      const input = context.createMediaStreamSource(stream)
      const gain = context.createGain()
      const compressor = context.createDynamicsCompressor()
      input.connect(compressor)
      compressor.connect(gain)
      return { input, gain, compressor }
    }}
  />
)
export const BufferSource = <InternalProps,>(
  props: ChildProps<
    {
      source?: AudioBufferSourceOptions
      buffer?: AudioBufferOptions
      url?: string
      data?: number[][]
    },
    { source: AudioBufferSourceNode; buffer: AudioBuffer },
    AudioContext,
    InternalProps
  >
) => (
  <ChildComponent
    options={props}
    getSelf={async (options, context) => {
      let buffer: AudioBuffer
      if (options?.url) {
        const data = await fetch(options.url)
        buffer = await context.decodeAudioData(await data.arrayBuffer())
      } else if (options?.data) {
        buffer = new AudioBuffer({
          length: options.data[0].length,
          numberOfChannels: options.data.length,
          sampleRate: context.sampleRate
        })
        for (let i = 0; i < options.data.length; i++)
          [buffer.copyToChannel(new Float32Array(options.data[i]), i)]
      } else {
        buffer = new AudioBuffer({
          length: 1000,
          numberOfChannels: 1,
          sampleRate: context.sampleRate,
          ...options.buffer
        })
      }
      return {
        source: new AudioBufferSourceNode(context, {
          ...options.source,
          buffer
        }),
        buffer
      }
    }}
  />
)
