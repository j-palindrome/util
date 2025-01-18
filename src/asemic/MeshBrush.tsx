import { extend, Object3DNode, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Vector2 } from 'three'
import {
  atan,
  float,
  Fn,
  If,
  instanceIndex,
  ivec2,
  mix,
  mrt,
  PI2,
  rotateUV,
  screenSize,
  select,
  texture,
  textureLoad,
  textureStore,
  uniform,
  uniformArray,
  varying,
  varyingProperty,
  vec2,
  vec4,
  vertexIndex
} from 'three/tsl'
import {
  MeshBasicNodeMaterial,
  StorageInstancedBufferAttribute,
  StorageTexture,
  WebGPURenderer
} from 'three/webgpu'
import { bezierPoint } from '../tsl/curves'
import { textureLoadFix } from '../tsl/utility'
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
  const resolution = new Vector2()
  const width = gl.getDrawingBufferSize(resolution).x
  builder.reInitialize(resolution)
  const verticesPerCurve = Math.floor(
    (builder.settings.maxLength * width) / (builder.settings.spacing * 5)
  )

  const { getBezier } = useControlPoints(builder)

  const { mesh, material, geometry } = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3))
    const indexGuide = [0, 1, 2, 1, 2, 3]

    let currentIndex = 0
    const indexes: number[] = []
    for (let i = 0; i < builder.settings.maxCurves; i++) {
      for (let i = 0; i < verticesPerCurve - 1; i++) {
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
    const mesh = new THREE.Mesh(geometry, material)

    const position = vec2().toVar('thisPosition')
    const rotation = float(0).toVar('rotation')
    const thickness = float(0).toVar('thickness')
    const color = varyingProperty('vec4', 'color')

    const main = Fn(() => {
      getBezier(
        () => vertexIndex.div(2).toFloat().div(verticesPerCurve),
        position,
        rotation,
        thickness,
        color
      )

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
    material.colorNode = varying(vec4(), 'color')
    material.needsUpdate = true

    return {
      mesh,
      material,
      geometry
    }
  }, [builder])

  const scene = useThree(({ scene }) => scene)
  useEffect(() => {
    scene.add(mesh)
    return () => {
      scene.remove(mesh)
      material.dispose()
      geometry.dispose()
    }
  }, [builder])

  return <></>
}
