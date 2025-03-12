import { extend, ThreeElement, useFrame, useThree } from '@react-three/fiber'
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
import BrushBuilder from '../builders/BrushBuilder'
import GroupBuilder from '../builders/GroupBuilder'

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

export class LineBrush extends BrushBuilder<'line'> {
  protected getDefaultBrushSettings(): { type: 'line' } {
    return { type: 'line' }
  }
  protected onFrame() {}
  protected onDraw() {}
  protected onInit() {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3))
    const indexGuide = [0, 1, 2, 1, 2, 3]

    let currentIndex = 0
    const indexes: number[] = []

    for (let i = 0; i < this.settings.maxCurves; i++) {
      if (this.settings.adjustEnds === 'loop') {
        const curveStart = currentIndex
        for (let i = 0; i < this.info.instancesPerCurve - 2; i++) {
          indexes.push(...indexGuide.map(x => x + currentIndex))
          currentIndex += 2
        }
        indexes.push(
          currentIndex,
          currentIndex + 1,
          curveStart,
          currentIndex + 1,
          curveStart,
          curveStart + 1
        )
        currentIndex += 2
      } else {
        for (let i = 0; i < this.info.instancesPerCurve - 1; i++) {
          indexes.push(...indexGuide.map(x => x + currentIndex))
          currentIndex += 2
        }
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
    material.mrtNode = this.settings.renderTargets

    const position = vec2().toVar('thisPosition')
    const rotation = float(0).toVar('rotation')
    const thickness = float(0).toVar('thickness')
    const color = varying(vec4(), 'color')
    const progress = varying(float(), 'progress')
    const vUv = varying(vec2(), 'vUv')

    const main = Fn(() => {
      this.getBezier(
        vertexIndex
          .div(2)
          .toFloat()
          .div(this.info.instancesPerCurve - 0.001),
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
          vertexIndex.div(2).toFloat().div(this.info.instancesPerCurve),
          select(vertexIndex.modInt(2).equal(0), 0, 1)
        )
      )

      // thickness.assign(0.1)
      position.addAssign(
        rotateUV(
          vec2(
            thickness.mul(select(vertexIndex.modInt(2).equal(0), -0.5, 0.5)),
            0
          ),
          rotation.add(PI2.mul(0.25)),
          vec2(0, 0)
        )
      )
      return vec4(position, 0, 1)
    })

    material.positionNode = main()

    material.colorNode = Fn(() =>
      this.settings.pointColor(varying(vec4(), 'color'), {
        progress,
        builder: this.group,
        uv: vUv
      })
    )()

    material.needsUpdate = true

    const mesh = new THREE.Mesh(geometry, material)
    this.info.material = material
    this.info.geometry = geometry
    this.info.mesh = mesh
    this.scene.add(mesh)
  }

  protected onDispose() {
    this.info.material.dispose()
    this.info.geometry.dispose()
    this.scene.remove(this.info.mesh)
  }
}
