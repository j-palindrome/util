import WebAudioRenderer from '@elemaudio/web-renderer'
import {
  Canvas,
  extend,
  Object3DNode,
  useFrame,
  useThree
} from '@react-three/fiber'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { HalfFloatType, OrthographicCamera, RenderTarget, Vector2 } from 'three'
import { Fn, pass, texture } from 'three/tsl'
import { PostProcessing, QuadMesh, WebGPURenderer } from 'three/webgpu'
import AttractorsBrush from './AttractorsBrush'
import SceneBuilder, { Constant, Ref, Uniform } from './Builder'
import MeshBrush from './MeshBrush'
import PointBrush from './PointBrush'
import { useEvents } from './util/useEvents'

extend({
  QuadMesh
})
declare module '@react-three/fiber' {
  interface ThreeElements {
    quadMesh: Object3DNode<QuadMesh, typeof QuadMesh>
  }
}

type AsemicContextType = {
  audio: SceneBuilder['audio']
}
export const AsemicContext = createContext<AsemicContextType>({ audio: null })

export function AsemicCanvas({
  children,
  className,
  dimensions: [width, height] = ['100%', '100%'],
  style
}: {
  className?: string
  dimensions?: [number | string, number | string]
  style?: React.CSSProperties
} & React.PropsWithChildren) {
  const [frameloop, setFrameloop] = useState<
    'never' | 'always' | 'demand' | undefined
  >('never')
  const [audio, setAudio] = useState<SceneBuilder['audio']>(null)
  const [started, setStarted] = useState(false)
  return !started ? (
    <button className='text-white' onClick={() => setStarted(true)}>
      start
    </button>
  ) : (
    <Canvas
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
          alpha: true
        })

        const initAudio = async () => {
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
        Promise.all([renderer.init(), initAudio()]).then(result => {
          setAudio(result[1])
          setFrameloop('always')
        })
        return renderer
      }}>
      {frameloop === 'always' && audio && (
        <AsemicContext.Provider value={{ audio }}>
          {children}
        </AsemicContext.Provider>
      )}
      {frameloop === 'always' && <Adjust />}
    </Canvas>
  )
}

function Adjust() {
  const resolution = new Vector2()
  useThree(state => {
    state.gl.getDrawingBufferSize(resolution)
    const camera = state.camera as OrthographicCamera
    // @ts-ignore
    const gl = state.gl as WebGPURenderer
    camera.top = resolution.height / resolution.width
    camera.updateProjectionMatrix()
  })
  return <></>
}

export default function Asemic({
  builder,
  settings
}: {
  builder: (b: SceneBuilder) => SceneBuilder | void
  settings?: Partial<SceneBuilder['sceneSettings']>
} & React.PropsWithChildren) {
  const { renderer, scene, camera } = useThree(({ gl, scene, camera }) => ({
    // @ts-expect-error
    renderer: gl as WebGPURenderer,
    scene,
    camera
  }))

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
  const readback = settings?.useReadback ? texture(renderTarget.texture) : null

  const postProcessing = new PostProcessing(renderer)
  const scenePass = pass(scene, camera)

  const controls = useEvents(settings)

  const b = new SceneBuilder(
    builder,
    {
      postProcessing: { postProcessing, scenePass, readback },
      h: resolution.y / resolution.x,
      audio,
      controls
    },
    settings
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

  let phase = true
  useFrame(() => {
    if (b.sceneSettings.useReadback) {
      phase = !phase
      postProcessing.renderer.setRenderTarget(
        phase ? renderTarget : renderTarget2
      )
      postProcessing.render()
      postProcessing.renderer.setRenderTarget(null)
      postProcessing.render()
      readback!.value = phase ? renderTarget.texture : renderTarget2.texture
      readback!.needsUpdate = true
    } else {
      postProcessing.render()
    }
  }, 1)

  // # AUDIO

  const renderAudio = () => {
    if (!b.audio) return
    const render = b.sceneSettings.audio!()
    if (render instanceof Array) b.audio.elCore.render(...render)
    else b.audio.elCore.render(render, render)
  }

  useEffect(renderAudio, [b])

  return (
    <>
      {b.groups.map((group, i) =>
        group.brushSettings.type === 'line' ? (
          <MeshBrush builder={group} key={i} />
        ) : group.brushSettings.type === 'dash' ? (
          <PointBrush builder={group} key={i} />
        ) : (
          <AttractorsBrush builder={group} key={i} />
        )
      )}
    </>
  )
}
