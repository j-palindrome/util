import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, InstancedMesh, PlaneGeometry } from 'three'
import {
  cos,
  Discard,
  float,
  Fn,
  hash,
  If,
  instancedArray,
  instanceIndex,
  Loop,
  max,
  PI2,
  screenSize,
  screenUV,
  sin,
  storage,
  uniform,
  uniformArray,
  uv,
  varying,
  varyingProperty,
  vec2,
  vec4
} from 'three/tsl'
import {
  SpriteNodeMaterial,
  StorageBufferAttribute,
  WebGPURenderer
} from 'three/webgpu'
import GroupBuilder from '../builders/GroupBuilder'
import BrushBuilder from '../builders/BrushBuilder'
// import sampleTex from './tex.png'

export class ParticlesBrush extends BrushBuilder<'particles'> {
  protected getDefaultBrushSettings(): BrushData<'particles'> {
    return {
      type: 'particles',
      speedDamping: 1e-5,
      initialSpread: true,
      speedMax: 1,
      speedMin: 0.4,
      speedFrame: 1,
      particleSize: 1,
      particleVelocity: input => input,
      particlePosition: input => input,
      attractorPull: 1,
      attractorPush: 0,
      particleCount: 1e4
    }
  }
  protected onFrame() {
    this.renderer.compute(this.info.update)
  }

  protected onDraw() {}

  protected onInit() {
    const count = this.settings.particleCount

    const material = new SpriteNodeMaterial({
      transparent: true,
      depthWrite: false
    })

    const timeScale = uniform(this.settings.speedFrame)
    const positionBuffer = instancedArray(count, 'vec2')
    const velocityBuffer = instancedArray(count, 'vec2')
    const colorBuffer = instancedArray(count, 'vec4')

    const init = Fn(() => {
      const position = positionBuffer.element(instanceIndex)
      const velocity = velocityBuffer.element(instanceIndex)
      if (!this.settings.initialSpread) {
        this.getBezier(
          instanceIndex.toFloat().div(this.info.instancesPerCurve),
          position
        )
        velocity.assign(
          vec2(
            hash(instanceIndex.add(Math.random() * 100))
              .mul(2)
              .sub(1),
            hash(instanceIndex.add(Math.random() * 100))
              .mul(2)
              .sub(1)
          )
        )
      } else {
        position.assign(
          vec2(
            hash(instanceIndex.add(Math.random() * 100)),
            hash(instanceIndex.add(Math.random() * 100)).mul(
              screenSize.y.div(screenSize.x)
            )
          )
        )
        velocity.assign(
          vec2(
            hash(instanceIndex.add(Math.random() * 100))
              .mul(2)
              .sub(1),
            hash(instanceIndex.add(Math.random() * 100))
              .mul(2)
              .sub(1)
          )
        )
      }
    })().compute(count)

    const update = Fn(() => {
      const delta = float(1 / 60)
        .mul(timeScale)
        .toVar() // uses fixed delta to consistent result
      const position = positionBuffer.element(instanceIndex)
      const velocity = velocityBuffer.element(instanceIndex)
      const color = vec4().toVar()
      const force = vec2(0).toVar()

      Loop(this.settings.maxCurves * this.info.instancesPerCurve, ({ i }) => {
        const attractorPosition = vec2().toVar()
        const rotation = float().toVar()
        const thickness = float().toVar()
        const thisColor = vec4().toVar()
        this.getBezier(
          float(i).div(this.info.instancesPerCurve),
          attractorPosition,
          {
            rotation,
            thickness,
            color: thisColor
          }
        )

        rotation.addAssign(PI2.mul(-0.25))

        // const attractorPosition = attractorsPositions.element(i)
        // const rotation = attractorsRotationAxes.element(i)
        const toAttractor = attractorPosition.sub(position)
        const distance = toAttractor.length()
        const gravityStrength = thickness.div(distance).pow(2).toVar()
        const direction = toAttractor.normalize()
        if (this.settings.attractorPull) {
          const gravityForce = direction
            .mul(gravityStrength)
            .mul(this.settings.attractorPull)
          If(distance.greaterThan(float(thickness).div(2)), () => {
            force.addAssign(gravityForce)
          })
        }
        if (this.settings.attractorPush) {
          // spinning
          const spinningForce = vec2(cos(rotation), sin(rotation))
            .normalize()
            .mul(gravityStrength)
            .mul(this.settings.attractorPush)
          // const spinningVelocity = spinningForce.cross(toAttractor)
          force.addAssign(spinningForce)
        }

        color.addAssign(
          thisColor.div(this.settings.maxCurves * this.info.instancesPerCurve)
        )
        // color.addAssign(thisColor)
        // color.addAssign(vec4(1, 1, 1, 1).div(100))
      })

      colorBuffer.element(instanceIndex).assign(color)
      // colorBuffer.element(instanceIndex).assign(vec4(1, 1, 1, 1))

      // velocity

      velocity.addAssign(force.mul(delta))
      const speed = velocity.length()
      If(speed.greaterThan(this.settings.speedMax), () => {
        velocity.assign(velocity.normalize().mul(this.settings.speedMax))
      })
      If(speed.lessThan(this.settings.speedMin), () => {
        velocity.assign(velocity.normalize().mul(this.settings.speedMin))
      })

      velocity.mulAssign(float(this.settings.speedDamping).oneMinus())

      position.assign(
        this.settings.particlePosition(position, {
          builder: this.group,
          progress: float(0)
        })
      )
      velocity.assign(
        this.settings.particleVelocity(velocity, position, {
          builder: this.group,
          progress: float(0)
        })
      )

      position.addAssign(velocity.mul(delta))
      position.modAssign(vec2(1, screenSize.y.div(screenSize.x)))
    })().compute(count)

    this.renderer.compute(init)

    // nodes
    material.positionNode = Fn(() =>
      this.settings.particlePosition(positionBuffer.element(instanceIndex), {
        progress: instanceIndex.toFloat().div(count),
        builder: this.group
      })
    )()

    const vUv = vec2().toVar()

    material.colorNode = Fn(() => {
      vUv.assign(screenUV.toVar())
      return this.settings.pointColor(
        // vec4(1, 1, 1, 1),
        colorBuffer.element(instanceIndex),
        {
          progress: float(0),
          builder: this.group,
          uv: vUv
        }
      )
    })()

    material.scaleNode = vec2(1, 1)
      .mul(this.settings.particleSize)
      .div(screenSize.x)

    const geometry = new PlaneGeometry(1, 1)
    const mesh = new InstancedMesh(geometry, material, count)
    this.scene.add(mesh)

    Object.assign(this.info, {
      mesh,
      geometry,
      material,
      update
    })
  }

  protected onDispose() {
    this.info.material.dispose()
    // this.info.geometry.dispose()
    this.scene.remove(this.info.mesh)
  }
}
