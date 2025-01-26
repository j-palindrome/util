import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
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
  PI2,
  screenSize,
  screenUV,
  sin,
  uniform,
  uv,
  varying,
  vec2,
  vec4
} from 'three/tsl'
import { SpriteNodeMaterial, WebGPURenderer } from 'three/webgpu'
import { GroupBuilder } from './Builder'
import { useControlPoints } from './util/packTexture'
// import sampleTex from './tex.png'

export default function AttractorsBrush(
  settings: Partial<GroupBuilder<'attractors'>['settings']>
) {
  const builder = new GroupBuilder('attractors', settings)
  // @ts-ignore
  const renderer = useThree(state => state.gl as WebGPURenderer)
  const scene = useThree(state => state.scene)

  const { getBezier, instancesPerCurve, hooks } = useControlPoints(builder)

  const { mesh, material, geometry } = useMemo(() => {
    const count = builder.settings.particleCount

    const material = new SpriteNodeMaterial({
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false
    })

    const timeScale = uniform(1)
    const positionBuffer = instancedArray(count, 'vec2')
    const velocityBuffer = instancedArray(count, 'vec2')

    const init = Fn(() => {
      const position = positionBuffer.element(instanceIndex)
      const velocity = velocityBuffer.element(instanceIndex)
      if (!builder.settings.initialSpread) {
        getBezier(instanceIndex.toFloat().div(instancesPerCurve), position)
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
      const force = vec2(0).toVar()

      Loop(builder.settings.maxCurves * instancesPerCurve, ({ i }) => {
        const attractorPosition = vec2().toVar()
        const rotation = float().toVar()
        const thickness = float().toVar()
        getBezier(float(i).div(instancesPerCurve), attractorPosition, {
          rotation,
          thickness
        })
        rotation.addAssign(PI2.mul(-0.25))

        // const attractorPosition = attractorsPositions.element(i)
        // const rotation = attractorsRotationAxes.element(i)
        const toAttractor = attractorPosition.sub(position)
        const distance = toAttractor.length().pow(2)
        const gravityStrength = float(thickness).div(distance).toVar()
        const direction = toAttractor.normalize()
        const gravityForce = direction
          .mul(gravityStrength)
          .mul(builder.settings.gravityForce)
        If(distance.greaterThan(float(1).div(screenSize.x)), () => {
          force.addAssign(gravityForce)
        }).Else(() => {
          // force.addAssign(gravityForce.negate())
        })

        // spinning
        const spinningForce = vec2(cos(rotation), sin(rotation))
          .normalize()
          .mul(gravityStrength)
          .mul(builder.settings.spinningForce)
        // const spinningVelocity = spinningForce.cross(toAttractor)
        force.addAssign(spinningForce)
      })

      // velocity

      velocity.addAssign(force.mul(delta))
      const speed = velocity.length()
      If(speed.greaterThan(builder.settings.maxSpeed), () => {
        velocity.assign(velocity.normalize().mul(builder.settings.maxSpeed))
      })
      If(speed.lessThan(builder.settings.minSpeed), () => {
        velocity.assign(velocity.normalize().mul(builder.settings.minSpeed))
      })

      velocity.mulAssign(float(builder.settings.damping).oneMinus())

      position.assign(
        builder.settings.pointPosition(position, {
          builder,
          progress: float(0)
        })
      )
      velocity.assign(
        builder.settings.pointVelocity(velocity, position, {
          builder,
          progress: float(0)
        })
      )

      position.addAssign(velocity.mul(delta))
      position.modAssign(vec2(1, screenSize.y.div(screenSize.x)))
    })().compute(count)

    // nodes
    material.positionNode = builder.settings.pointPosition(
      // @ts-ignore
      positionBuffer.toAttribute(),
      {
        progress: instanceIndex.toFloat().div(count),
        builder
      }
    )

    const vUv = varying(vec2(), 'vUv')
    material.colorNode = Fn(() => {
      vUv.assign(screenUV)
      If(uv().sub(0.5).length().greaterThan(0.5), () => {
        Discard()
      })
      const alpha = float(
        uv().sub(0.5).length().remap(0, 0.5, 1, 0).pow(2)
      ).toVar()
      return builder.settings.pointColor(
        vec4(...builder.settings.particleColor, builder.settings.particleAlpha),
        {
          progress: float(0),
          builder,
          uv: vUv
        }
      )
    })()

    material.scaleNode = vec2(1, 1)
      .mul(builder.settings.pointSize)
      .div(screenSize.x)

    const geometry = new PlaneGeometry(1, 1)
    const mesh = new InstancedMesh(geometry, material, count)

    renderer.compute(init)

    hooks.onUpdate = () => {
      renderer.compute(update)
    }

    hooks.onInit = () => {}

    return {
      mesh,
      geometry,
      material
    }
  }, [builder])

  useEffect(() => {
    scene.add(mesh)
    return () => {
      scene.remove(mesh)
      mesh.dispose()
      material.dispose()
    }
  }, [builder])

  return <></>
}
