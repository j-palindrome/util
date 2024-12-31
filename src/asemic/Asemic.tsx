import { Canvas } from '@react-three/fiber'
import { useState } from 'react'
import { Vector2, WebGPURenderer } from 'three/webgpu'
import Brush from './Brush'
import Builder from './Builder'

export default function Asemic({
  children,
  className,
  builder
}: {
  className?: string
  builder: (b: Builder) => Builder
} & React.PropsWithChildren) {
  const [frameloop, setFrameloop] = useState<
    'never' | 'always' | 'demand' | undefined
  >('never')

  const keyframes = new Builder(builder)
  const resolution = new Vector2(
    window.innerWidth * window.devicePixelRatio,
    window.innerHeight * window.devicePixelRatio
  )
  const lastData = keyframes.reInitialize(resolution)

  return (
    <Canvas
      frameloop={frameloop}
      className={className}
      style={{ height: '100vh', width: '100vw' }}
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
      {lastData.map((lastData, i) => (
        <Brush lastData={lastData} key={i} />
      ))}
      {children}
    </Canvas>
  )
}
