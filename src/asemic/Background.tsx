import { extend, Object3DNode } from '@react-three/fiber'
import { MeshBasicNodeMaterial } from 'three/webgpu'
import { useAsemic } from './Asemic'
import { useHeight } from './util'
import { useEffect, useRef } from 'react'

extend({ MeshBasicNodeMaterial })
declare module '@react-three/fiber' {
  interface ThreeElements {
    meshBasicNodeMaterial: Object3DNode<
      MeshBasicNodeMaterial,
      typeof MeshBasicNodeMaterial
    >
  }
}
export default function Background(
  args: JSX.IntrinsicElements['meshBasicNodeMaterial']
) {
  const h = useHeight()
  const mat = useRef<MeshBasicNodeMaterial>(null!)
  useEffect(() => {
    mat.current.needsUpdate = true
  })
  return (
    <mesh position={[0.5, 0.5 * h, 0]}>
      <meshBasicNodeMaterial {...args} ref={mat} />
      <planeGeometry args={[1, h]} />
    </mesh>
  )
}
