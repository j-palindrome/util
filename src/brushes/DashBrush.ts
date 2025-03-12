import { extend, ThreeElement, useFrame, useThree } from '@react-three/fiber'
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
  vec4
} from 'three/tsl'
import {
  SpriteNodeMaterial,
  StorageInstancedBufferAttribute,
  WebGPURenderer
} from 'three/webgpu'
import GroupBuilder from '../builders/GroupBuilder'
// import { useCurve } from '../util/useControlPoints'
import BrushBuilder from '../builders/BrushBuilder'

type VectorList = [number, number]
type Vector3List = [number, number, number]

extend({ StorageInstancedBufferAttribute })
declare module '@react-three/fiber' {
  interface ThreeElements {
    storageInstancedBufferAttribute: ThreeElement<
      typeof StorageInstancedBufferAttribute
    >
  }
}

export class DashBrush extends BrushBuilder<'dash'> {
  protected getDefaultBrushSettings() {
    return { type: 'dash', dashSize: 10 } as BrushData<'dash'>
  }
  protected onFrame() {
    this.renderer.compute(this.info.updateCurveLengths)
  }
  protected onDraw() {}
  protected onInit() {
    const MAX_INSTANCE_COUNT =
      this.info.instancesPerCurve * this.settings.maxCurves

    const geometry = new THREE.PlaneGeometry(1, 1, 1, 1)
    geometry.translate(0, 0, 0)
    const material = new SpriteNodeMaterial({
      transparent: true,
      depthWrite: false
    })
    material.mrtNode = this.settings.renderTargets
    const mesh = new THREE.InstancedMesh(geometry, material, MAX_INSTANCE_COUNT)

    material.mrtNode = this.settings.renderTargets

    const rotation = float(0).toVar()
    const thickness = float(0).toVar()
    const color = varying(vec4(), 'color')
    const progress = varying(float(), 'progress')

    const tAttribute = instancedArray(
      new Float32Array(this.info.instancesPerCurve * this.settings.maxCurves),
      'float'
    )

    const updateCurveLengths = Fn(() => {
      const curveIndex = instanceIndex
        .toFloat()
        .div(this.info.instancesPerCurve)
      const curveStart = floor(curveIndex)
      const targetLength = curveIndex.fract().mul(this.settings.maxLength)
      const found = int(0).toVar()
      const totalLength = float(0).toVar()
      const lastEnd = float(0).toVar()
      const lastPoint = vec2(0, 0).toVar()
      const thisPoint = vec2(0, 0).toVar()
      this.getBezier(curveIndex, thisPoint)

      If(curveIndex.fract().equal(0), () => {
        tAttribute.element(instanceIndex).assign(curveIndex)
        Return()
      })

      this.getBezier(curveStart, thisPoint)
      const count = 10
      // @ts-expect-error
      Loop({ start: 1, end: count }, ({ i }) => {
        lastPoint.assign(thisPoint)
        const t = curveStart.add(
          float(i)
            .div(count - 1)
            .mul(0.999)
        )
        this.getBezier(t, thisPoint)
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
      this.info.instancesPerCurve * this.settings.maxCurves,
      undefined as any
    )

    const position = vec2().toVar()
    material.positionNode = Fn(() => {
      this.getBezier(tAttribute.element(instanceIndex), position, {
        rotation,
        thickness,
        color,
        progress
      })

      return vec4(
        this.settings.pointPosition(position, {
          progress,
          builder: this.group
        }),
        0,
        1
      )
    })()
    material.rotationNode = rotation

    material.scaleNode = vec2(
      float(this.settings.dashSize).div(screenSize.x),
      thickness
    )
    material.colorNode = this.settings.pointColor(color, {
      progress,
      builder: this.group,
      uv: varying(vec2(progress, 0.5), 'uv')
    })
    material.needsUpdate = true
    this.scene.add(mesh)

    Object.assign(this.info, {
      mesh,
      material,
      geometry,
      updateCurveLengths
    })
  }

  protected onDispose() {
    this.info.material.dispose()
    this.info.geometry.dispose()
    this.scene.remove(this.info.mesh)
  }
}
