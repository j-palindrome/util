'use client'
import { Canvas, useThree } from '@react-three/fiber'
import { useState } from 'react'
import {
  Color,
  OrthographicCamera,
  Vector2,
  WebGPURenderer
} from 'three/webgpu'
import Brush from './Brush'
import Builder from './Builder'
import Color4 from 'three/src/renderers/common/Color4.js'

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
    <div
      style={{ height: height ?? '100%', width: width ?? '100%', ...style }}
      className={className}>
      <Canvas
        style={{ height: '100%', width: '100%' }}
        frameloop={frameloop}
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
        {frameloop === 'always' && <Scene builder={builder} />}
        {children}
      </Canvas>
    </div>
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
    camera.top = resolution.height / resolution.width
    camera.updateProjectionMatrix()
  })
  const b = new Builder(builder)
  return (
    <>
      {b.groups.map((group, i) => (
        <Brush builder={group} key={i} />
      ))}
    </>
  )
}
