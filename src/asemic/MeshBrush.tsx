import { extend, Object3DNode, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import {
  Discard,
  float,
  Fn,
  If,
  rotateUV,
  select,
  varying,
  varyingProperty,
  vec2,
  vec4,
  vertexIndex
} from 'three/tsl'
import {
  MeshBasicNodeMaterial,
  StorageInstancedBufferAttribute,
  WebGPURenderer
} from 'three/webgpu'
import { GroupBuilder } from './Builder'
import { useControlPoints } from './util/packTexture'

type VectorList = [number, number]
type Vector3List = [number, number, number]
export type Jitter = {
  size?: VectorList
  position?: VectorList
  hsl?: Vector3List
  a?: number
  rotation?: number
}

extend({ StorageInstancedBufferAttribute })
declare module '@react-three/fiber' {
  interface ThreeElements {
    storageInstancedBufferAttribute: Object3DNode<
      StorageInstancedBufferAttribute,
      typeof StorageInstancedBufferAttribute
    >
  }
}

export default function MeshBrush({
  builder
}: {
  builder: GroupBuilder<'line'>
}) {
  // @ts-ignore
  const gl = useThree(({ gl }) => gl as WebGPURenderer)

  const { getBezier, resolution, instancesPerCurve } = useControlPoints(builder)
  const { material, geometry } = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3))
    const indexGuide = [0, 1, 2, 1, 2, 3]

    let currentIndex = 0
    const indexes: number[] = []

    const width = resolution.x
    for (let i = 0; i < builder.settings.maxCurves; i++) {
      for (let i = 0; i < instancesPerCurve - 1; i++) {
        indexes.push(...indexGuide.map(x => x + currentIndex))
        currentIndex += 2
      }
      currentIndex += 2
    }
    geometry.setIndex(indexes)
    const material = new MeshBasicNodeMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
      color: 'white'
    })
    material.mrtNode = builder.settings.renderTargets

    const position = vec2().toVar('thisPosition')
    const rotation = float(0).toVar('rotation')
    const thickness = float(0).toVar('thickness')
    const color = varyingProperty('vec4', 'color')
    const progress = varyingProperty('float', 'progress')

    const main = Fn(() => {
      getBezier(vertexIndex.div(2).toFloat().div(instancesPerCurve), position, {
        rotation,
        thickness,
        color,
        progress
      })

      position.addAssign(
        rotateUV(
          vec2(
            thickness.mul(select(vertexIndex.modInt(2).equal(0), -0.5, 0.5)),
            0
          ),
          rotation,
          vec2(0, 0)
        )
      )

      return vec4(position, 0, 1)
    })

    material.positionNode = main()
    material.colorNode = builder.settings.pointFrag(varying(vec4(), 'color'), {
      progress,
      settings: builder.settings
    })
    material.needsUpdate = true

    return {
      material,
      geometry
    }
  }, [builder])

  const scene = useThree(({ scene }) => scene)
  useEffect(() => {
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)
    return () => {
      scene.remove(mesh)
      material.dispose()
      geometry.dispose()
    }
  }, [builder])

  return <></>
}
