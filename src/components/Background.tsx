// @ts-nocheck
import React, { JSX } from 'react'
import { extend, ThreeElement } from '@react-three/fiber'

import { useEffect, useRef } from 'react'
import { MeshBasicNodeMaterial } from 'three/webgpu'
import { useHeight } from '../util'

extend({ MeshBasicNodeMaterial })
declare module '@react-three/fiber' {
  interface ThreeElements {
    meshBasicNodeMaterial: ThreeElement<typeof MeshBasicNodeMaterial>
  }
}
export default function Background(
  args: JSX.IntrinsicElements['meshBasicNodeMaterial'],
) {
  const h = useHeight()
  const mat = useRef<MeshBasicNodeMaterial>(null!)
  useEffect(() => {
    mat.current.needsUpdate = true
  })
  return (
    <mesh position={[0.5, 0.5 * h, 0]}>
      <meshBasicNodeMaterial transparent {...args} ref={mat} />
      <planeGeometry args={[1, h]} />
    </mesh>
  )
}
