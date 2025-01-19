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
import { textureLoadFix } from '../tsl/utility'

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

  const { mesh, material, geometry, tAttribute, updateCurveLengths } =
    useMemo(() => {
      const MAX_INSTANCE_COUNT = instancesPerCurve * builder.settings.maxCurves

      const geometry = new THREE.PlaneGeometry(1, 1, 1, 1)
      geometry.translate(builder.settings.align - 0.5, 0.5, 0)
      const material = new SpriteNodeMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
      material.mrtNode = builder.settings.renderTargets
      const mesh = new THREE.InstancedMesh(
        geometry,
        material,
        MAX_INSTANCE_COUNT
      )

      material.mrtNode = builder.settings.renderTargets

      const rotation = float(0).toVar()
      const thickness = float(0).toVar()
      const color = varyingProperty('vec4', 'color')

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
        const lastPoint = vec2(0.123, 0.123).toVar()
        const thisPoint = vec2(0, 0).toVar()
        getBezier(curveIndex, thisPoint)

        If(curveIndex.fract().equal(0), () => {
          tAttribute.element(instanceIndex).assign(curveIndex)
          Return()
        })

        const count = 10
        Loop(count, ({ i }) => {
          lastPoint.assign(thisPoint)
          getBezier(curveStart.add(float(i).div(count - 1)), thisPoint)
          lastEnd.assign(totalLength)
          totalLength.addAssign(thisPoint.sub(lastPoint).length())
          If(totalLength.greaterThanEqual(targetLength), () => {
            const remapped = remap(targetLength, lastEnd, totalLength, 0, 1)
            found.assign(1)
            // assign the t-property to be the progress through the total length of each curve
            tAttribute
              .element(instanceIndex)
              // @ts-expect-error
              .assign(float(curveIndex).add(i.sub(1).add(remapped).div(count)))
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
        getBezier(instanceIndex.toFloat().div(instancesPerCurve), position, {
          rotation,
          thickness,
          color
        })
        return vec4(position, 0, 1)
      })()
      material.rotationNode = rotation
      material.scaleNode = vec2(
        thickness,
        float(builder.brushSettings.dashSize).div(screenSize.x)
      )
      material.colorNode = Fn(() => {
        const color = varying(vec4(), 'color')
        If(color.a.equal(0), () => Discard())
        return color
      })()
      material.needsUpdate = true

      return {
        mesh,
        material,
        geometry,
        updateCurveLengths,
        tAttribute
      }
    }, [builder])

  hooks.onInit = () => {
    gl.compute(updateCurveLengths)
    const getBuffer = async () => {
      console.log(
        new Float32Array(await gl.getArrayBufferAsync(tAttribute.value))
      )
    }
    getBuffer()
  }

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
