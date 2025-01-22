import {
  Canvas,
  extend,
  Object3DNode,
  useFrame,
  useThree
} from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import {
  CanvasTexture,
  DataTexture,
  FloatType,
  FramebufferTexture,
  HalfFloatType,
  OrthographicCamera,
  RenderTarget,
  RGBAFormat,
  UnsignedByteType,
  Vector2
} from 'three'
import { Fn, mrt, output, pass, texture, uv } from 'three/tsl'
import {
  MeshBasicNodeMaterial,
  PostProcessing,
  QuadMesh,
  StorageTexture,
  WebGPURenderer
} from 'three/webgpu'
import SceneBuilder from './Builder'
import MeshBrush from './MeshBrush'
import PointBrush from './PointBrush'
import AttractorsBrush from './AttractorsBrush'
import Feedback from './Feedback'
import { range } from 'lodash'

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
  style
}: {
  className?: string
  dimensions?: [number | string, number | string]
  style?: React.CSSProperties
} & React.PropsWithChildren) {
  const [frameloop, setFrameloop] = useState<
    'never' | 'always' | 'demand' | undefined
  >('never')

  return (
    <Canvas
      style={{ height: height ?? '100%', width: width ?? '100%', ...style }}
      frameloop={frameloop}
      // frameloop={'never'}
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

        renderer.init().then(() => {
          setFrameloop('always')
        })
        return renderer
      }}>
      {frameloop === 'always' && children}
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

  const renderTarget = new RenderTarget(resolution.x, resolution.y, {
    type: HalfFloatType
  })
  const renderTarget2 = new RenderTarget(resolution.x, resolution.y, {
    type: HalfFloatType
  })
  const readback = texture(renderTarget.texture)

  const postProcessing = new PostProcessing(renderer)
  const scenePass = pass(scene, camera)

  const b = new SceneBuilder(
    builder,
    { postProcessing, h: resolution.y / resolution.x, scenePass },
    settings
  )
  // const feedback = new Feedback(resolution.x, resolution.y)
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
    phase = !phase
    postProcessing.renderer.setRenderTarget(
      phase ? renderTarget : renderTarget2
    )
    postProcessing.render()
    postProcessing.renderer.setRenderTarget(null)
    postProcessing.render()
    readback.value = phase ? renderTarget.texture : renderTarget2.texture
    readback.needsUpdate = true
  }, 1)

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
