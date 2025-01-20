import { extend, Object3DNode, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import {
  Break,
  Discard,
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
  varyingProperty,
  vec2,
  vec4
} from 'three/tsl'
import {
  SpriteNodeMaterial,
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

export default function PointBrush({
  builder
}: {
  builder: GroupBuilder<'dash'>
}) {
  // @ts-ignore
  const gl = useThree(({ gl }) => gl as WebGPURenderer)

  const { getBezier, instancesPerCurve, hooks } = useControlPoints(builder)

  const { mesh, material, geometry } = useMemo(() => {
    const MAX_INSTANCE_COUNT = instancesPerCurve * builder.settings.maxCurves

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
    const color = varyingProperty('vec4', 'color')
    const progress = varyingProperty('float', 'progress')

    const tAttribute = instancedArray(
      new Float32Array(instancesPerCurve * builder.settings.maxCurves),
      'float'
    )

    const updateCurveLengths = Fn(() => {
      const curveIndex = instanceIndex.toFloat().div(instancesPerCurve)
      const curveStart = floor(curveIndex)
      const targetLength = curveIndex.fract().mul(builder.settings.maxLength)
      const found = int(0).toVar()
      const totalLength = float(0).toVar()
      const lastEnd = float(0).toVar()
      const lastPoint = vec2(0, 0).toVar()
      const thisPoint = vec2(0, 0).toVar()
      getBezier(curveIndex, thisPoint)

      If(curveIndex.fract().equal(0), () => {
        tAttribute.element(instanceIndex).assign(curveIndex)
        Return()
      })

      getBezier(curveStart, thisPoint)
      const count = 10
      // @ts-expect-error
      Loop({ start: 1, end: count }, ({ i }) => {
        lastPoint.assign(thisPoint)
        const t = curveStart.add(
          float(i)
            .div(count - 1)
            .mul(0.999)
        )
        getBezier(t, thisPoint)
        lastEnd.assign(totalLength)
        totalLength.addAssign(thisPoint.sub(lastPoint).length())
        If(totalLength.greaterThanEqual(targetLength), () => {
          const remapped = remap(targetLength, lastEnd, totalLength, 0, 1)
          found.assign(1)
          // assign the t-property to be the progress through the total length of each curve
          tAttribute.element(instanceIndex).assign(
            curveStart.add(
              float(i)
                .sub(1)
                .add(remapped)
                .div(count - 1)
            )
          )
          Break()
        })
      })

      If(found.equal(0), () => {
        tAttribute.element(instanceIndex).assign(-1)
      })

      return undefined as any
    })().compute(
      instancesPerCurve * builder.settings.maxCurves,
      undefined as any
    )

    const position = vec2().toVar()
    material.positionNode = Fn(() => {
      getBezier(tAttribute.element(instanceIndex), position, {
        rotation,
        thickness,
        color,
        progress
      })

      return vec4(
        builder.settings.pointVert(position, {
          progress,
          height: builder.h,
          settings: builder.settings
        }),
        0,
        1
      )
    })()
    material.rotationNode = builder.brushSettings.pointRotate(rotation, {
      progress,
      height: builder.h,
      settings: builder.settings
    })
    material.scaleNode = builder.brushSettings.pointScale(
      vec2(thickness, float(builder.brushSettings.dashSize).div(screenSize.x)),
      { progress, height: builder.h, settings: builder.settings }
    )
    material.colorNode = builder.settings.pointFrag(varying(vec4(), 'color'), {
      progress,
      height: builder.h,
      settings: builder.settings
    })
    material.needsUpdate = true
    hooks.onUpdate = () => {
      gl.compute(updateCurveLengths)
    }

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
