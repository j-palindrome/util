import { Canvas, useThree } from '@react-three/fiber'
import { useState } from 'react'
import { OrthographicCamera, Vector2, WebGPURenderer } from 'three/webgpu'
import Brush from './Brush'
import Builder from './Builder'

export default function Asemic({
  children,
  className,
  builder,
  dimensions: [width, height] = ['100%', '100%'],
  style
}: {
  className?: string
  dimensions?: [number | string, number | string]
  style?: React.CSSProperties
  builder: (b: Builder) => Builder
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
        top: 0,
        bottom: -1,
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
      {frameloop === 'always' && <Scene builder={builder} />}
      {children}
    </Canvas>
  )
}

function Scene({
  builder
}: {
  builder: (b: Builder) => Builder
} & React.PropsWithChildren) {
  const resolution = new Vector2()

  useThree(state => {
    state.gl.getDrawingBufferSize(resolution)
    const camera = state.camera as OrthographicCamera
    // @ts-ignore
    const gl = state.gl as WebGPURenderer
    camera.bottom = -resolution.height / resolution.width

    camera.updateProjectionMatrix()
  })
  const keyframes = new Builder(builder, resolution)
  const lastData = keyframes.reInitialize()
  return (
    <>
      {lastData.map((lastData, i) => (
        <Brush lastData={lastData} key={i} />
      ))}
    </>
  )
}
