import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
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

  const points: [number, number][] = []
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

  const canvas = useThree(state => state.gl.domElement)
  useEffect(() => {
    let points: [number, number][] = []
    const onClick = ev => {
      if (ev.shiftKey) {
        if (ev.metaKey) {
          points = []
        } else {
          points.splice(points.length - 1, 1)
        }
      } else {
        points.push([
          (ev.clientX - canvas.clientLeft) / canvas.clientWidth,
          (canvas.clientHeight - (ev.clientY - canvas.clientTop)) /
            canvas.clientWidth
        ])
      }
      const newPoints = points
        .map(x => `[${x[0].toFixed(2)}, ${x[1].toFixed(2)}]`)
        .join(', ')
      window.navigator.clipboard.writeText(newPoints)
      console.log(newPoints)
    }
    canvas.addEventListener('mousedown', onClick)
    return () => {
      canvas.removeEventListener('mousedown', onClick)
    }
  }, [])

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
