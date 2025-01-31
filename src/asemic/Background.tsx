import { extend, Object3DNode } from '@react-three/fiber'
import { MeshBasicNodeMaterial } from 'three/webgpu'
import { useAsemic } from './Asemic'
import { useHeight } from './util'

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
  return (
    <mesh position={[0.5, 0.5 * h, 0]}>
      <meshBasicNodeMaterial {...args} />
      <planeGeometry args={[1, h]} />
    </mesh>
  )
}
