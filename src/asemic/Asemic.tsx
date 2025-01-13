import { Canvas, useThree } from '@react-three/fiber'
import { useState } from 'react'
import { OrthographicCamera, Vector2 } from 'three'
import Brush from './Brush'
import SceneBuilder from './Builder'
import { WebGPURenderer } from 'three/webgpu'
import MeshBrush from './MeshBrush'

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
  builder
}: {
  builder: (b: SceneBuilder) => SceneBuilder | void
} & React.PropsWithChildren) {
  const b = new SceneBuilder(builder)
  return (
    <>
      {b.groups.map((group, i) => (
        <MeshBrush builder={group} key={i} />
      ))}
    </>
  )
}
