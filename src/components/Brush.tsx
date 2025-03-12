import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { WebGPURenderer } from 'three/webgpu'
import { BlobBrush } from '../brushes/BlobBrush'
import { DashBrush } from '../brushes/DashBrush'
import { DotBrush } from '../brushes/DotBrush'
import { LineBrush } from '../brushes/LineBrush'
import { ParticlesBrush } from '../brushes/ParticlesBrush'
import { StripeBrush } from '../brushes/StripeBrush'
import GroupBuilder from '../builders/GroupBuilder'
// import sampleTex from './tex.png'

export default function Brush<T extends BrushTypes>({
  children,
  type,
  ...settings
}: BrushProps<T>) {
  // @ts-ignore
  const renderer = useThree((state) => state.gl as WebGPURenderer)
  const scene = useThree((state) => state.scene)
  const builderRef = useRef(null!)
  useFrame((state) => {
    builderRef.current?.frame(state.clock.elapsedTime)
    //comment
  })
  useEffect(() => {
    const group = new GroupBuilder(children)
    const createBuilder = () => {
      let constructor
      switch (type) {
        case 'blob':
          constructor = BlobBrush
          break
        case 'dash':
          constructor = DashBrush
          break
        case 'dot':
          constructor = DotBrush
          break
        case 'line':
          constructor = LineBrush
          break
        case 'particles':
          constructor = ParticlesBrush
          break
        case 'stripe':
          constructor = StripeBrush
          break
      }
      return new constructor(settings, {
        renderer,
        group,
        scene,
      })
    }
    const builder = createBuilder()
    builderRef.current = builder
    return () => {
      builder.dispose()
      builderRef.current = null
    }
  }, [children, type, settings])

  return <></>
}
