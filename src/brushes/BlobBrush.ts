import { extend, ThreeElement, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import {
  float,
  Fn,
  If,
  rotateUV,
  select,
  uniformArray,
  varying,
  vec2,
  vec4,
  vertexIndex,
} from 'three/tsl'
import {
  MeshBasicNodeMaterial,
  StorageInstancedBufferAttribute,
  WebGPURenderer,
} from 'three/webgpu'
import GroupBuilder from '../builders/GroupBuilder'
import { range } from 'lodash'
import BrushBuilder from '../builders/BrushBuilder'

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
    storageInstancedBufferAttribute: ThreeElement<
      typeof StorageInstancedBufferAttribute
    >
  }
}

export class BlobBrush extends BrushBuilder<'blob'> {
  protected getDefaultBrushSettings(): {
    type: 'blob'
    centerMode: 'center' | 'first' | 'betweenEnds'
  } {
    return { type: 'blob', centerMode: 'center' }
  }
  protected onFrame() {}
  protected onDraw() {
    const array = this.info.centerPoints.array as THREE.Vector2[]
    const colorArray = this.info.centerColors.array as THREE.Vector4[]
    for (let i = 0; i < this.settings.maxCurves; i++) {
      switch (this.settings.centerMode) {
        case 'center':
          const bounds = this.group.getBounds(this.group.curves[i])
          array[i].copy(bounds.center)
          colorArray[i].set(
            ...this.group.curves[i][0].color,
            this.group.curves[i][0].alpha,
          )
          break
        case 'first':
          array[i].copy(this.group.curves[i][0])
          colorArray[i].set(
            ...this.group.curves[i][0].color,
            this.group.curves[i][0].alpha,
          )
          break
        case 'betweenEnds':
          const lastPoint =
            this.group.curves[i][this.group.curves[i].length - 1]
          array[i].lerpVectors(this.group.curves[i][0], lastPoint, 0.5)
          colorArray[i].set(
            ...this.group.curves[i][0].color,
            this.group.curves[i][0].alpha,
          )
          const lastColor = new THREE.Vector4(
            ...lastPoint.color,
            lastPoint.alpha,
          )
          colorArray[i].lerp(lastColor, 0.5)
          break
      }
    }
  }
  protected onInit() {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3))
    const indexes: number[] = []

    for (let curveI = 0; curveI < this.settings.maxCurves; curveI++) {
      for (let i = 1; i < this.info.instancesPerCurve - 1; i++) {
        indexes.push(
          curveI,
          curveI + i + this.settings.maxCurves,
          curveI + i + 1 + this.settings.maxCurves,
        )
      }
      indexes.push(
        curveI,
        curveI + 1 + this.settings.maxCurves,
        curveI + this.info.instancesPerCurve - 1 + this.settings.maxCurves,
      )
    }

    geometry.setIndex(indexes)
    const material = new MeshBasicNodeMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
      color: 'white',
    })
    material.mrtNode = this.settings.renderTargets

    const position = vec2().toVar('thisPosition')
    const color = varying(vec4(), 'color')
    const progress = varying(float(), 'progress')
    const vUv = varying(vec2(), 'vUv')

    const centerPoints = uniformArray(
      range(this.settings.maxCurves).map(() => new THREE.Vector2()),
      'vec2',
    )
    const centerColors = uniformArray(
      range(this.settings.maxCurves).map(() => new THREE.Vector4()),
      'vec4',
    )

    const main = Fn(() => {
      If(vertexIndex.lessThan(this.settings.maxCurves), () => {
        position.assign(centerPoints.element(vertexIndex))
        color.assign(centerColors.element(vertexIndex))
        vUv.assign(vec2(0, 0))
      }).Else(() => {
        this.getBezier(
          vertexIndex
            .sub(this.settings.maxCurves)
            .toFloat()
            .div(this.info.instancesPerCurve - 0.999),
          position,
          {
            color,
            progress,
          },
        )
        vUv.assign(
          vec2(
            vertexIndex
              .sub(this.settings.maxCurves)
              .toFloat()
              .div(this.info.instancesPerCurve - 0.999),
            1,
          ),
        )
      })

      return vec4(position, 0, 1)
    })

    material.positionNode = main()

    material.colorNode = Fn(() =>
      this.settings.pointColor(varying(vec4(), 'color'), {
        progress,
        builder: this.group,
        uv: vUv,
      }),
    )()

    material.needsUpdate = true

    const mesh = new THREE.Mesh(geometry, material)
    this.scene.add(mesh)

    Object.assign(this.info, {
      material,
      geometry,
      mesh,
      centerPoints,
      centerColors,
    })
  }
  protected onDispose() {
    this.scene.remove(this.info.mesh)
    this.info.material.dispose()
    this.info.geometry.dispose()
  }
}
