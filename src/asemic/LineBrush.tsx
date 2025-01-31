import { extend, Object3DNode, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import {
  float,
  Fn,
  PI2,
  rotateUV,
  select,
  varying,
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
import { useControlPoints } from './util/useControlPoints'

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

export default function LineBrush<K extends Record<string, any>>({
  params = {} as any,
  ...settings
}: { params?: K } & Partial<GroupBuilder<'line', K>['settings']>) {
  const builder = new GroupBuilder('line', settings, params)
  // @ts-ignore
  const gl = useThree(({ gl }) => gl as WebGPURenderer)

  const { getBezier, instancesPerCurve } = useControlPoints(builder)
  const { material, geometry } = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3))
    const indexGuide = [0, 1, 2, 1, 2, 3]

    let currentIndex = 0
    const indexes: number[] = []

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
    const color = varying(vec4(), 'color')
    const progress = varying(float(), 'progress')
    const vUv = varying(vec2(), 'vUv')

    const main = Fn(() => {
      getBezier(
        vertexIndex
          .div(2)
          .toFloat()
          .div(instancesPerCurve - 0.001),
        position,
        {
          rotation,
          thickness,
          color,
          progress
        }
      )

      vUv.assign(
        vec2(
          vertexIndex.div(2).toFloat().div(instancesPerCurve),
          select(vertexIndex.modInt(2).equal(0), 0, 1)
        )
      )

      position.addAssign(
        rotateUV(
          vec2(
            thickness.mul(select(vertexIndex.modInt(2).equal(0), -0.5, 0.5)),
            0
          ),
          rotation.sub(PI2.mul(0.25)),
          vec2(0, 0)
        )
      )
      return vec4(position, 0, 1)
    })

    material.positionNode = main()

    material.colorNode = Fn(() =>
      builder.settings.pointColor(varying(vec4(), 'color'), {
        progress,
        builder,
        uv: vUv
      })
    )()

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
