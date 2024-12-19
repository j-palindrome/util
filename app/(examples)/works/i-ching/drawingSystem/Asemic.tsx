import { Canvas } from '@react-three/fiber'
import { useRef } from 'react'
import Builder from './Builder'
import Brush from './Brush'
import { now } from 'lodash'

export default function Asemic(
  props: React.PropsWithChildren & { builders?: ((b: Builder) => Builder)[] }
) {
  const points = useRef<[number, number][]>([])

  return (
    <>
      <Canvas
        style={{ height: '100%', width: '100%' }}
        gl={{ antialias: true, alpha: true }}
        orthographic
        camera={{
          position: [0, 0, 0],
          near: 0,
          far: 1,
          left: 0,
          top: 1,
          right: 1,
          bottom: 0
        }}
        onClick={ev => {
          if (ev.shiftKey) {
            points.current = []
          }
          const point = [
            ev.clientX / window.innerWidth,
            (window.innerHeight - ev.clientY) / window.innerHeight
          ] as [number, number]
          points.current.push(point)
          const text = points.current
            .map(x => `[${x[0].toFixed(2)}, ${x[1].toFixed(2)}]`)
            .join(', ')
          console.log(point.map(x => x.toFixed(2)))
          window.navigator.clipboard.writeText(text)
        }}>
        <Scene />
        {props.children}
        {props.builders?.map((b, i) => <Brush key={i + now()} render={b} />)}
      </Canvas>
    </>
  )
}

function Scene() {
  return <></>
}
