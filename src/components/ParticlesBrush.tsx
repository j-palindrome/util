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
  vec4,
} from 'three/tsl'
import {
  SpriteNodeMaterial,
  StorageBufferAttribute,
  WebGPURenderer,
} from 'three/webgpu'
import GroupBuilder from '../builders/GroupBuilder'
import { useCurve } from '../util/useControlPoints'
import BrushBuilder from '../builders/BrushBuilder'
// import sampleTex from './tex.png'

export default function ParticlesBrush({
  children,
  ...settings
}: { children: ConstructorParameters<typeof GroupBuilder>[0] } & Partial<
  BrushBuilder<'particles'>['settings']
>) {
  const group = new GroupBuilder(children)
  const builder = new BrushBuilder('particles', settings)

  const { getBezier, instancesPerCurve, hooks } = useCurve(group, builder)
  const scene = useThree((state) => state.scene)
  // @ts-ignore
  const renderer = useThree((state) => state.gl as WebGPURenderer)

  const { mesh, material, geometry } = useMemo(() => {
    const count = builder.settings.particleCount

    const material = new SpriteNodeMaterial({
      transparent: true,
      depthWrite: false,
    })

    const timeScale = uniform(1)
    const positionBuffer = instancedArray(count, 'vec2')
    const velocityBuffer = instancedArray(count, 'vec2')
    const colorBuffer = instancedArray(count, 'vec4')

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
              screenSize.y.div(screenSize.x),
            ),
          ),
        )
        velocity.assign(
          vec2(
            hash(instanceIndex.add(Math.random() * 100))
              .mul(2)
              .sub(1),
            hash(instanceIndex.add(Math.random() * 100))
              .mul(2)
              .sub(1),
          ),
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

      Loop(builder.settings.maxCurves * instancesPerCurve, ({ i }) => {
        const attractorPosition = vec2().toVar()
        const rotation = float().toVar()
        const thickness = float().toVar()
        const thisColor = vec4().toVar()
        getBezier(float(i).div(instancesPerCurve), attractorPosition, {
          rotation,
          thickness,
          color: thisColor,
        })

        rotation.addAssign(PI2.mul(-0.25))

        // const attractorPosition = attractorsPositions.element(i)
        // const rotation = attractorsRotationAxes.element(i)
        const toAttractor = attractorPosition.sub(position)
        const distance = toAttractor.length()
        const gravityStrength = thickness.div(distance).pow(2).toVar()
        const direction = toAttractor.normalize()
        const gravityForce = direction
          .mul(gravityStrength)
          .mul(builder.settings.attractorPull)
        If(distance.greaterThan(float(1).div(screenSize.x)), () => {
          force.addAssign(gravityForce)
        }).Else(() => {})

        // spinning
        const spinningForce = vec2(cos(rotation), sin(rotation))
          .normalize()
          .mul(gravityStrength)
          .mul(builder.settings.attractorPush)
        // const spinningVelocity = spinningForce.cross(toAttractor)
        force.addAssign(spinningForce)
        color.addAssign(
          thisColor.mul(max(0, thickness.sub(distance).div(thickness))),
        )
        // color.addAssign(thisColor)
      })

      colorBuffer.element(instanceIndex).assign(color)

      // velocity

      velocity.addAssign(force.mul(delta))
      const speed = velocity.length()
      If(speed.greaterThan(builder.settings.speedMax), () => {
        velocity.assign(velocity.normalize().mul(builder.settings.speedMax))
      })
      If(speed.lessThan(builder.settings.speedMin), () => {
        velocity.assign(velocity.normalize().mul(builder.settings.speedMin))
      })

      velocity.mulAssign(float(builder.settings.speedDamping).oneMinus())

      position.assign(
        builder.settings.particlePosition(position, {
          builder,
          progress: float(0),
        }),
      )
      velocity.assign(
        builder.settings.particleVelocity(velocity, position, {
          builder,
          progress: float(0),
        }),
      )

      position.addAssign(velocity.mul(delta))
      position.modAssign(vec2(1, screenSize.y.div(screenSize.x)))
    })().compute(count)

    // nodes
    material.positionNode = Fn(() =>
      // @ts-ignore
      builder.settings.particlePosition(positionBuffer.toAttribute(), {
        progress: instanceIndex.toFloat().div(count),
        builder,
      }),
    )()

    const vUv = vec2().toVar()
    material.colorNode = Fn(() => {
      vUv.assign(screenUV.toVar())
      If(uv().sub(0.5).length().greaterThan(0.5), () => {
        Discard()
      })
      return builder.settings.pointColor(
        // vec4(1, 1, 1, 1),
        // @ts-ignore
        colorBuffer.toAttribute(),
        {
          progress: float(0),
          builder,
          uv: vUv,
        },
      )
    })()

    material.scaleNode = vec2(1, 1)
      .mul(builder.settings.particleSize)
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
      material,
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
