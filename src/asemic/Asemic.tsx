import WebAudioRenderer from '@elemaudio/web-renderer'
import {
  Canvas,
  extend,
  Object3DNode,
  useFrame,
  useThree
} from '@react-three/fiber'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { HalfFloatType, OrthographicCamera, RenderTarget, Vector2 } from 'three'
import { Fn, mrt, output, pass, texture, velocity } from 'three/tsl'
import { PostProcessing, QuadMesh, WebGPURenderer } from 'three/webgpu'
import AttractorsBrush from './AttractorsBrush'
import SceneBuilder from './Builder'
import MeshBrush from './MeshBrush'
import PointBrush from './PointBrush'
import { AsemicContext } from './util/asemicContext'
import { SettingsInput, useEvents } from './util/useEvents'
import { traaPass } from 'three/addons/tsl/display/TRAAPassNode.js'

extend({
  QuadMesh
})

declare module '@react-three/fiber' {
  interface ThreeElements {
    quadMesh: Object3DNode<QuadMesh, typeof QuadMesh>
  }
}

export function AsemicCanvas({
  children,
  className,
  dimensions: [width, height] = ['100%', '100%'],
  style,
  useAudio = false
}: {
  className?: string
  dimensions?: [number | string, number | string]
  style?: React.CSSProperties
  useAudio?: boolean
} & React.PropsWithChildren) {
  const [audio, setAudio] = useState<SceneBuilder<any>['audio']>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null!)
  const [started, setStarted] = useState(useAudio ? false : true)
  // const [recording, setRecording] = useState(false)
  const [frameloop, setFrameloop] = useState<'never' | 'always'>('never')

  return !started ? (
    <button className='text-white' onClick={() => setStarted(true)}>
      start
    </button>
  ) : (
    <>
      {/*<button
        className='text-white'
        onClick={() => {
          setRecording(!recording)
        }}>
        {!recording ? 'record' : 'recording...'}
      </button>*/}
      <Canvas
        ref={canvasRef}
        style={{ height: height ?? '100%', width: width ?? '100%', ...style }}
        frameloop={frameloop}
        className={className}
        orthographic
        camera={{
          near: 0,
          far: 1,
          left: 0,
          right: 1,
          top: 1,
          bottom: 0,
          position: [0, 0, 0]
        }}
        gl={canvas => {
          const renderer = new WebGPURenderer({
            canvas: canvas as HTMLCanvasElement,
            powerPreference: 'high-performance',
            antialias: true,
            depth: false,
            stencil: false,
            alpha: true
          })

          const initAudio = async () => {
            if (!useAudio) return null
            const audioContext = new AudioContext()
            const core = new WebAudioRenderer()
            const elNode = await core.initialize(audioContext, {
              numberOfInputs: 0,
              numberOfOutputs: 1,
              outputChannelCount: [2]
            })
            elNode.connect(audioContext.destination)
            return { ctx: audioContext, elCore: core, elNode }
          }

          renderer.backend.utils.getPreferredCanvasFormat = () => {
            return 'rgba16float'
          }

          Promise.all([renderer.init(), initAudio()]).then(async result => {
            const context = renderer.getContext()
            context.configure({
              device: renderer.backend.device,
              format: renderer.backend.utils.getPreferredCanvasFormat()
            })

            setAudio(result[1])
            setFrameloop('always')
          })
          return renderer
        }}>
        {frameloop === 'always' && (audio || !useAudio) && (
          <AsemicContext.Provider value={{ audio }}>
            {children}
          </AsemicContext.Provider>
        )}
        {frameloop === 'always' && <Adjust />}
      </Canvas>
    </>
  )
}

function Adjust() {
  const resolution = new Vector2()
  useThree(state => {
    state.gl.getDrawingBufferSize(resolution)
    const camera = state.camera as OrthographicCamera
    // @ts-expect-error
    const gl = state.gl as WebGPURenderer
    camera.top = resolution.height / resolution.width
    camera.updateProjectionMatrix()
  })
  return <></>
}

export default function Asemic<T extends SettingsInput>({
  controls,
  children,
  ...settings
}: {
  controls?: T
  children:
    | JSX.Element[]
    | JSX.Element
    | ((b: SceneBuilder<T>) => JSX.Element[] | JSX.Element)
} & Partial<SceneBuilder<T>['sceneSettings']>) {
  const { renderer, scene, camera, invalidate, advance } = useThree(
    ({ gl, scene, camera, invalidate, advance }) => ({
      // @ts-expect-error
      renderer: gl as WebGPURenderer,
      scene,
      camera,
      invalidate,
      advance
    })
  )
  controls = {
    constants: { ...controls?.constants },
    uniforms: { ...controls?.uniforms },
    refs: { ...controls?.refs }
  } as T

  const resolution = new Vector2()
  useThree(state => {
    state.gl.getDrawingBufferSize(resolution)
  })

  const { audio } = useContext(AsemicContext)
  const renderTarget = new RenderTarget(resolution.x, resolution.y, {
    type: HalfFloatType
  })
  const renderTarget2 = new RenderTarget(resolution.x, resolution.y, {
    type: HalfFloatType
  })
  const readback = texture(renderTarget.texture)

  const postProcessing = new PostProcessing(renderer)
  const scenePass = pass(scene, camera)

  const controlsBuilt = useEvents(controls)

  const b = new SceneBuilder(
    settings,
    {
      postProcessing: { postProcessing, scenePass, readback },
      h: resolution.y / resolution.x,
      size: resolution,
      audio
    },
    controlsBuilt
  )

  postProcessing.outputNode = Fn(() => {
    const output = b.sceneSettings
      .postProcessing(scenePass.getTextureNode('output'), {
        scenePass,
        readback
      })
      .toVar('outputAssign')
    return output
  })()

  // useEffect(() => {
  //   // if (!recording) return
  //   // if (!recording) {
  //   //   recorder.stop()
  //   // }
  //   // const stream = canvasRef.current.captureStream(60) // 30 is the desired frame rate
  //   // const chunks: Blob[] = []
  //   // const recorder = new MediaRecorder(stream)
  //   // recorder.ondataavailable = event => {
  //   //   chunks.push(event.data)
  //   // }
  //   // recorder.onstop = event => {
  //   //   const blob = new Blob(chunks, { type: 'video/m4a' })
  //   //   const videoUrl = URL.createObjectURL(blob)
  //   //   const video = document.createElement('video')
  //   //   video.src = videoUrl
  //   //   video.controls = true
  //   //   document.body.appendChild(video)
  //   //   setRecording(false)
  //   // }
  //   // recorder.start()
  //   // window.setTimeout(() => recorder.stop(), 2000)
  //   // capture image sequence down
  // }, [recording])

  const link = useMemo(() => {
    const link = document.createElement('a')
    return link
  }, [])

  const blobs: string[] = []

  let phase = true
  let counter = useRef(0)
  let lastTime = useRef(performance.now())

  useFrame(() => {
    if (b.sceneSettings.useReadback) {
      phase = !phase
      postProcessing.renderer.setRenderTarget(
        phase ? renderTarget : renderTarget2
      )
      postProcessing.render()
      postProcessing.renderer.setRenderTarget(null)
      postProcessing.render()
      readback.value = phase ? renderTarget.texture : renderTarget2.texture
      readback.needsUpdate = true
    } else {
      postProcessing.render()
    }
  }, 1)

  // # AUDIO ----

  const renderAudio = () => {
    if (!b.audio || !b.sceneSettings.audio) return
    const render = b.sceneSettings.audio()
    if (render instanceof Array) b.audio.elCore.render(...render)
    else b.audio.elCore.render(render, render)
  }

  useEffect(renderAudio, [b])

  return <>{typeof children === 'function' ? children(b) : children}</>
}
