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
  sin,
  uniform,
  uv,
  vec2,
  vec4
} from 'three/tsl'
import { SpriteNodeMaterial, WebGPURenderer } from 'three/webgpu'
import { GroupBuilder } from './Builder'
import { useControlPoints } from './util/packTexture'
// import sampleTex from './tex.png'

export default function AttractorsBrush({
  builder
}: {
  builder: GroupBuilder<'attractors'>
}) {
  // @ts-ignore
  const renderer = useThree(state => state.gl as WebGPURenderer)
  const scene = useThree(state => state.scene)

  const { getBezier, instancesPerCurve, hooks } = useControlPoints(builder)

  const { mesh, material, geometry } = useMemo(() => {
    // particles

    // const count = 1e6
    const count = builder.brushSettings.particleCount

    const material = new SpriteNodeMaterial({
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false
    })

    // const attractorMass = uniform(1e4)
    // const particleGlobalMass = uniform(10e6)
    // const timeScale = uniform(1)
    // const spinningStrength = uniform(3)
    // const maxSpeed = uniform(10)
    // const gravityConstant = 6e-13
    // const velocityDamping = uniform(0.1)
    // const scale = float(3).div(screenSize.x)
    // ------
    const timeScale = uniform(1)
    const positionBuffer = instancedArray(count, 'vec2')
    const velocityBuffer = instancedArray(count, 'vec2')

    const init = Fn(() => {
      const position = positionBuffer.element(instanceIndex)
      const velocity = velocityBuffer.element(instanceIndex)
      if (!builder.brushSettings.initialSpread) {
        getBezier(instanceIndex.toFloat().div(instancesPerCurve), position)
      } else {
        position.assign(
          vec2(
            hash(instanceIndex),
            hash(instanceIndex.add(Math.random() * 100)).mul(
              screenSize.y.div(screenSize.x)
            )
          )
        )
        velocity.assign(
          vec2(
            hash(instanceIndex.add(Math.random() * 100)),
            hash(instanceIndex.add(Math.random() * 100)).mul(
              screenSize.y.div(screenSize.x)
            )
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
          .mul(builder.brushSettings.gravityForce)
        If(distance.greaterThan(float(1).div(screenSize.x)), () => {
          force.addAssign(gravityForce)
        }).Else(() => {
          // force.addAssign(gravityForce.negate())
        })

        // spinning
        const spinningForce = vec2(cos(rotation), sin(rotation))
          .normalize()
          .mul(gravityStrength)
          .mul(builder.brushSettings.spinningForce)
        // const spinningVelocity = spinningForce.cross(toAttractor)
        force.addAssign(spinningForce)
      })

      // velocity

      velocity.addAssign(force.mul(delta))
      const speed = velocity.length()
      If(speed.greaterThan(builder.brushSettings.maxSpeed), () => {
        velocity.assign(
          velocity.normalize().mul(builder.brushSettings.maxSpeed)
        )
      })

      velocity.mulAssign(float(builder.brushSettings.damping).oneMinus())

      position.assign(builder.brushSettings.pointPosition(position))
      velocity.assign(builder.brushSettings.pointVelocity(velocity, position))

      position.addAssign(velocity.mul(delta))
      position.modAssign(vec2(1, screenSize.y.div(screenSize.x)))
    })().compute(count)

    // nodes
    material.positionNode = builder.settings.pointVert(
      // @ts-ignore
      positionBuffer.toAttribute(),
      {
        progress: instanceIndex.toFloat().div(count),
        builder
      }
    )

    material.colorNode = Fn(() => {
      If(uv().sub(0.5).length().greaterThan(0.5), () => {
        Discard()
      })
      const alpha = float(
        uv().sub(0.5).length().remap(0, 0.5, 1, 0).pow(2)
      ).toVar()
      return builder.settings.pointFrag(vec4(1, 1, 1, alpha), {
        progress: float(0),
        builder
      })
    })()

    material.scaleNode = vec2(1, 1)
      .mul(builder.brushSettings.pointSize)
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

  // const blur = float(0.0625)
  // const grad = vec2(0, 0)

  // .grad(grad, grad)
  // const vuv = vec2(0.5, 1 - 0.99)
  // const vuv = uv().mul(vec2(1, 0.2))

  // testNode.fragmentNode =

  return <></>
}
