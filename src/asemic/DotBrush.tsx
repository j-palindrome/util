import { extend, Object3DNode, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import {
  Break,
  float,
  floor,
  Fn,
  If,
  instancedArray,
  instanceIndex,
  int,
  Loop,
  remap,
  Return,
  screenSize,
  varying,
  vec2,
  vec4,
  vertexIndex
} from 'three/tsl'
import {
  SpriteNodeMaterial,
  StorageInstancedBufferAttribute,
  WebGPURenderer
} from 'three/webgpu'
import { GroupBuilder } from './Builder'
import { useCurve, usePoints } from './util/useControlPoints'

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

export default function DotBrush<K extends Record<string, any>>({
  params = {} as K,
  ...settings
}: { params?: K } & Partial<GroupBuilder<'dash', K>['settings']>) {
  const builder = new GroupBuilder('dash', settings, params)
  // @ts-ignore
  const gl = useThree(({ gl }) => gl as WebGPURenderer)

  const { hooks, curveColorArray, curvePositionArray } = usePoints(builder)

  const { mesh } = useMemo(() => {
    const MAX_INSTANCE_COUNT =
      builder.settings.maxPoints * builder.settings.maxCurves

    const geometry = new THREE.PlaneGeometry(1, 1, 1, 1)
    geometry.translate(builder.settings.align - 0.5, 0.5, 0)
    const material = new SpriteNodeMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
    material.mrtNode = builder.settings.renderTargets
    const mesh = new THREE.InstancedMesh(geometry, material, MAX_INSTANCE_COUNT)

    material.mrtNode = builder.settings.renderTargets

    const rotation = float(0).toVar()
    const thickness = float(0).toVar()
    const color = varying(vec4(), 'color')
    const progress = varying(float(), 'progress')

    const tAttribute = instancedArray(
      new Float32Array(instancesPerCurve * builder.settings.maxCurves),
      'float'
    )

    const position = vec2().toVar()
    material.positionNode = Fn(() => {
      position.assign(curvePositions.element(instanceIndex))

      return vec4(
        builder.settings.pointPosition(position, {
          progress,
          builder
        }),
        0,
        1
      )
    })()
    material.rotationNode = rotation

    material.scaleNode = vec2(
      thickness,
      float(builder.settings.dashSize).div(screenSize.x)
    )
    material.colorNode = builder.settings.pointColor(color, {
      progress,
      builder,
      uv: varying(vec2(progress, 0.5), 'uv')
    })
    material.needsUpdate = true

    return {
      mesh,
      material,
      geometry,
      updateCurveLengths
    }
  }, [builder])

  const scene = useThree(({ scene }) => scene)
  useEffect(() => {
    scene.add(mesh)
    return () => {
      scene.remove(mesh)
      mesh.dispose()
    }
  }, [builder])

  return <></>
}
