declare module 'hydra-synth' {
  export type HydraSynth = any
  export default class HydraInstance {
    synth: HydraSynth
    constructor(
      options: Partial<{
        canvas: HTMLCanvasElement | null // canvas element to render to. If none is supplied, a canvas will be created and appended to the screen
        width: number // defaults to canvas width when included, 1280 if not
        height: number // defaults to canvas height when included, 720 if not
        autoLoop: boolean // if true, will automatically loop using requestAnimationFrame.If set to false, you must implement your own loop function using the tick() method (below)
        makeGlobal: boolean // if false, will not pollute global namespace (note: there are currently bugs with this)
        detectAudio: boolean // recommend setting this to false to avoid asking for microphone
        numSources: number // number of source buffers to create initially
        numOutputs: number // number of output buffers to use. Note: untested with numbers other than 4. render() method might behave unpredictably
        extendTransforms: any[] // An array of transforms to be added to the synth, or an object representing a single transform
        precision: null | 'highp' | 'mediump' | 'lowp' // force precision of shaders, can be 'highp', 'mediump', or 'lowp' (recommended for ios). When no precision is specified, will use highp for ios, and mediump for everything else.
        pb: null // instance of rtc-patch-bay to use for streaming
      }>
    )
  }
}
