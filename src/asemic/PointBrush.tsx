import { extend, Object3DNode, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Vector2 } from 'three'
import {
  atan,
  Break,
  float,
  Fn,
  If,
  instanceIndex,
  int,
  ivec2,
  Loop,
  mix,
  remap,
  rotateUV,
  screenSize,
  storage,
  texture,
  textureLoad,
  textureStore,
  uniform,
  varying,
  varyingProperty,
  vec2,
  vec3,
  vec4
} from 'three/tsl'
import {
  SpriteNodeMaterial,
  StorageBufferAttribute,
  StorageInstancedBufferAttribute,
  StorageTexture,
  WebGPURenderer
} from 'three/webgpu'
import { bezierPoint, lineTangent } from '../tsl/curves'
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

export default function PointBrush({
  builder
}: {
  builder: GroupBuilder<'dash'>
}) {
  // @ts-ignore
  const gl = useThree(({ gl }) => gl as WebGPURenderer)
  const resolution = new Vector2()
  const width = gl.getDrawingBufferSize(resolution).x

  const { getBezier } = useControlPoints(builder)

  const {
    mesh,
    material,
    geometry,
    MAX_INSTANCE_COUNT
    // tArray
  } = useMemo(() => {
    const instancesPerCurve = Math.floor(
      builder.settings.spacingType === 'pixel'
        ? (builder.settings.maxLength * width) / builder.settings.spacing
        : builder.settings.spacingType === 'width'
          ? (builder.settings.maxLength * width) /
            (builder.settings.spacing * width)
          : builder.settings.spacingType === 'count'
            ? builder.settings.spacing
            : 0
    )
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

    const position = vec2().toVar('thisPosition')
    const rotation = float(0).toVar('rotation')
    const thickness = float(0).toVar('thickness')
    const color = varyingProperty('vec4', 'color')

    const main = Fn(() => {
      getBezier(
        controlPointCounts => {
          const curveIndex = instanceIndex.div(instancesPerCurve)
          return vec2(
            instanceIndex
              .toFloat()
              .mod(instancesPerCurve)
              .div(instancesPerCurve)
              .mul(0.999),
            curveIndex
          )
        },
        position,
        rotation,
        thickness,
        color
      )

      return vec4(position, 0, 1)
    })

    material.positionNode = main()
    material.colorNode = varying(vec4(), 'color')
    material.needsUpdate = true

    return {
      mesh,
      material,
      geometry,
      MAX_INSTANCE_COUNT
      // tArray
    }
  }, [builder])

  // const updateCurves = useMemo(() => {
  //   const tAttribute = storage(tArray, 'vec2', MAX_INSTANCE_COUNT)
  //   // @ts-ignore
  //   const t = tAttribute.toAttribute()

  //   // const generateSpacing = () => {
  //   //   switch (builder.settings.spacingType) {
  //   //     case 'pixel':
  //   //       return int(builder.settings.maxLength * width).div(
  //   //         builder.brushSettings.dashSize
  //   //       )
  //   //     case 'width':
  //   //       return int(builder.settings.maxLength * width).div(
  //   //         int(float(builder.brushSettings.dashSize).mul(screenSize.x))
  //   //       )
  //   //     case 'count':
  //   //       return int(builder.brushSettings.dashSize)
  //   //   }
  //   // }

  //   // const instancesPerCurve = generateSpacing()

  // //   const updateCurveLengths = /*#__PURE__*/ Fn(() => {
  // //     const curveProgress = instanceIndex.div(instancesPerCurve)
  // //     const controlPointsCount = controlPointCounts.element(curveProgress)
  // //     const found = float(0).toVar('found')
  // //     const targetLength = instanceIndex
  // //       .modInt(instancesPerCurve)
  // //       .toFloat()
  // //       .div(instancesPerCurve.toFloat())
  // //       .mul(builder.settings.maxLength)
  // //     const totalLength = float(0).toVar('totalLength')
  // //     If(controlPointsCount.equal(2), () => {
  // //       const p0 = textureLoadFix(
  // //         texture(curvePositionTex),
  // //         ivec2(0, curveProgress)
  // //       ).xy
  // //       const p1 = textureLoadFix(
  // //         texture(curvePositionTex),
  // //         ivec2(1, curveProgress)
  // //       ).xy
  // //       totalLength.assign(p1.sub(p0).length())
  // //       if (builder.settings.resample) {
  // //         If(totalLength.greaterThanEqual(targetLength), () => {
  // //           found.assign(1)
  // //           tAttribute
  // //             .element(instanceIndex)
  // //             .assign(vec2(targetLength.div(totalLength), curveProgress))
  // //         })
  // //       }
  // //     }).Else(() => {
  // //       const lastEnd = float(0).toVar('lastEnd')
  // //       const lastPoint = vec2(0, 0).toVar('lastPoint')
  // //       const thisPoint = vec2(0, 0).toVar('thisPoint')
  // //       thisPoint.assign(
  // //         textureLoadFix(texture(curvePositionTex), ivec2(0, curveProgress)).xy
  // //       )
  // //       // Find the subdivisions, then linearly interpolate between the subdivisions...on the graphics card.
  // //       const count = controlPointsCount
  // //         .mul(6)
  // //         .mul(builder.settings.maxLength)
  // //       Loop(
  // //         {
  // //           // @ts-ignore
  // //           start: 1,
  // //           end: count,
  // //           type: 'float',
  // //           condition: '<'
  // //         },
  // //         ({ i }) => {
  // //           lastPoint.assign(thisPoint)
  // //           const t = float(i).div(count).mul(controlPointsCount.sub(2))
  // //           thisPoint.assign(
  // //             getBezier(t, curveProgress, controlPointsCount).position
  // //           ).xy
  // //           lastEnd.assign(totalLength)
  // //           totalLength.addAssign(thisPoint.sub(lastPoint).length())
  // //           if (builder.settings.resample) {
  // //             If(totalLength.greaterThanEqual(targetLength), () => {
  // //               const remapped = remap(targetLength, lastEnd, totalLength, 0, 1)
  // //               found.assign(1)
  // //               tAttribute
  // //                 .element(instanceIndex)
  // //                 .assign(
  // //                   vec2(
  // //                     float(i)
  // //                       .sub(1)
  // //                       .add(remapped)
  // //                       .div(count)
  // //                       .mul(controlPointsCount.sub(2)),
  // //                     curveProgress
  // //                   )
  // //                 )
  // //               Break()
  // //             })
  // //           }
  // //         }
  // //       )
  // //       if (!builder.settings.resample) {
  // //         If(totalLength.greaterThanEqual(targetLength), () => {
  // //           found.assign(1)
  // //           tAttribute
  // //             .element(instanceIndex)
  // //             .assign(
  // //               vec2(
  // //                 targetLength.div(totalLength).mul(controlPointsCount.sub(2)),
  // //                 curveProgress
  // //               )
  // //             )
  // //         })
  // //       }
  // //     })

  // //     If(found.equal(0), () => {
  // //       tAttribute.element(instanceIndex).xy.assign(vec2(-1, -1))
  // //     })

  // //     return undefined as any
  // //   })().compute(MAX_INSTANCE_COUNT, undefined as any)
  // }, [])

  const scene = useThree(({ scene }) => scene)
  useEffect(() => {
    scene.add(mesh)
    return () => {
      scene.remove(mesh)
      mesh.dispose()
      material.dispose()
      geometry.dispose()
    }
  }, [builder])

  return <></>
}
