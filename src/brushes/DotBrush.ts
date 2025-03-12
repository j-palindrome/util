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
  max,
  remap,
  Return,
  screenSize,
  uv,
  varying,
  vec2,
  vec4,
  vertexIndex,
} from 'three/tsl'
import {
  SpriteNodeMaterial,
  StorageInstancedBufferAttribute,
  WebGPURenderer,
} from 'three/webgpu'
import GroupBuilder from '../builders/GroupBuilder'
import { gaussian } from '../util/gaussian'
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

export class DotBrush extends BrushBuilder<'dot'> {
  protected getDefaultBrushSettings(): { type: 'dot' } {
    return { type: 'dot' }
  }

  protected onDispose() {
    this.scene.remove(this.info.mesh)
    this.info.mesh.dispose()
  }

  protected onDraw() {}

  protected onInit() {
    const MAX_INSTANCE_COUNT = this.settings.maxPoints * this.settings.maxCurves

    const geometry = new THREE.PlaneGeometry(1, 1, 1, 1)
    geometry.translate(this.settings.align - 0.5, 0.5, 0)
    const material = new SpriteNodeMaterial({
      transparent: true,
      depthWrite: false,
      // blending: THREE.AdditiveBlending
    })
    material.mrtNode = this.settings.renderTargets
    const mesh = new THREE.InstancedMesh(geometry, material, MAX_INSTANCE_COUNT)

    material.mrtNode = this.settings.renderTargets

    const thickness = float(0).toVar()
    const color = varying(vec4(), 'color')
    const progress = varying(float(), 'progress')

    const position = vec2().toVar()
    material.positionNode = Fn(() => {
      progress.assign(instanceIndex.toFloat().div(this.settings.maxPoints))
      position.assign(this.info.curvePositionArray.element(instanceIndex).xy)
      thickness.assign(
        this.info.curvePositionArray.element(instanceIndex).w.div(screenSize.x),
      )
      color.assign(this.info.curveColorArray.element(instanceIndex))

      return vec4(
        this.settings.pointPosition(position.sub(vec2(0, thickness.div(2))), {
          progress,
          builder: this.group,
        }),
        0,
        1,
      )
    })()

    material.scaleNode = vec2(thickness, thickness)
    material.colorNode = this.settings.pointColor(
      vec4(color.xyz, gaussian(uv().sub(0.5).length()).mul(color.a)),
      {
        progress,
        builder: this.group,
        uv: varying(vec2(progress, 0.5), 'uv'),
      },
    )
    material.needsUpdate = true

    this.scene.add(mesh)
    this.info.mesh = mesh
  }

  protected onFrame() {}
}
