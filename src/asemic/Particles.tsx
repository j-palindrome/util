import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { AdditiveBlending, InstancedMesh, PlaneGeometry, Vector3 } from 'three'
import {
  color,
  cos,
  Discard,
  float,
  Fn,
  hash,
  If,
  instancedArray,
  instanceIndex,
  Loop,
  mix,
  mod,
  PI,
  screenSize,
  sin,
  uint,
  uniform,
  uniformArray,
  uv,
  vec2,
  vec3,
  vec4
} from 'three/tsl'
import { SpriteNodeMaterial, WebGPURenderer } from 'three/webgpu'
import useHeight from './util'
import { pi } from 'mathjs'
import { createNoise2D } from 'simplex-noise'

export default function Particles() {
  // @ts-ignore
  const renderer = useThree(state => state.gl as WebGPURenderer)
  const scene = useThree(state => state.scene)
  const h = useHeight()
  const {
    mesh,
    geometry,
    material,
    updateCompute,
    attractorsPositions,
    attractorsRotationAxes
  } = useMemo(() => {
    const attractorsPositions = uniformArray([
      new Vector3(Math.random(), Math.random() * h, 0),
      new Vector3(Math.random(), Math.random() * h, 0),
      new Vector3(Math.random(), Math.random() * h, 0)
    ])
    const attractorsRotationAxes = uniformArray([
      new Vector3(Math.random(), Math.random(), 0),
      new Vector3(Math.random(), Math.random(), 0),
      new Vector3(Math.random(), Math.random(), 0).normalize()
    ])
    const attractorsLength = uniform(attractorsPositions.array.length, 'uint')

    // particles

    const count = 1e6
    const material = new SpriteNodeMaterial({
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false
    })

    const attractorMass = uniform(1e5)
    const particleGlobalMass = uniform(10e6)
    const timeScale = uniform(1)
    const spinningStrength = uniform(3)
    const maxSpeed = uniform(20)
    const gravityConstant = 6e-11
    const velocityDamping = uniform(0.1)
    const scale = float(3).div(screenSize.x)

    const positionBuffer = instancedArray(count, 'vec3')
    const velocityBuffer = instancedArray(count, 'vec3')

    const sphericalToVec3 = Fn(([phi, theta]) => {
      const sinPhiRadius = sin(phi)

      return vec3(
        sinPhiRadius.mul(sin(theta)),
        cos(phi),
        sinPhiRadius.mul(cos(theta))
      )
    })

    // init compute

    const init = Fn(() => {
      const position = positionBuffer.element(instanceIndex)
      const velocity = velocityBuffer.element(instanceIndex)

      const basePosition = vec3(
        hash(instanceIndex.add(uint(Math.random() * 0xffffff))),
        hash(instanceIndex.add(uint(Math.random() * 0xffffff))),
        0
      )
      position.assign(basePosition)

      const phi = hash(instanceIndex.add(uint(Math.random() * 0xffffff)))
        .mul(PI)
        .mul(2)
      const theta = hash(instanceIndex.add(uint(Math.random() * 0xffffff))).mul(
        PI
      )
      const baseVelocity = sphericalToVec3(phi, theta).mul(0.05)
      velocity.assign(baseVelocity)
    })

    const initCompute = init().compute(count)

    const reset = () => {
      renderer.computeAsync(initCompute)
    }

    reset()

    // update compute

    const particleMassMultiplier = hash(
      instanceIndex.add(uint(Math.random() * 0xffffff))
    )
      .remap(0.25, 1)
      .toVar()
    const particleMass = particleMassMultiplier.mul(particleGlobalMass).toVar()

    const update = Fn(() => {
      // const delta = timerDelta().mul( timeScale ).min( 1 / 30 ).toVar();
      const delta = float(1 / 60)
        .mul(timeScale)
        .toVar() // uses fixed delta to consistent result
      const position = positionBuffer.element(instanceIndex)
      const velocity = velocityBuffer.element(instanceIndex)

      // force

      const force = vec3(0).toVar()

      Loop(attractorsLength, ({ i }) => {
        const attractorPosition = attractorsPositions.element(i)
        const attractorRotationAxis = attractorsRotationAxes.element(i)
        const toAttractor = attractorPosition.sub(position)
        const distance = toAttractor.length()
        const direction = toAttractor.normalize()

        // gravity
        const gravityStrength = attractorMass
          .mul(particleMass)
          .mul(gravityConstant)
          .div(distance.pow(2))
          .toVar()
        const gravityForce = direction.mul(gravityStrength)
        force.addAssign(gravityForce)

        // spinning
        const spinningForce = attractorRotationAxis
          .mul(gravityStrength)
          .mul(spinningStrength)
        const spinningVelocity = spinningForce.cross(toAttractor)
        force.addAssign(spinningVelocity)
      })

      // velocity

      velocity.addAssign(force.mul(delta))
      const speed = velocity.length()
      If(speed.greaterThan(maxSpeed), () => {
        velocity.assign(velocity.normalize().mul(maxSpeed))
      })
      velocity.mulAssign(velocityDamping.oneMinus())

      // position

      position.addAssign(velocity.mul(delta))
      position.modAssign(vec3(1, h, 0))
    })
    const updateCompute = update().compute(count)

    // nodes
    // @ts-ignore
    material.positionNode = positionBuffer.toAttribute()

    material.colorNode = Fn(() => {
      // @ts-ignore
      const velocity = velocityBuffer.toAttribute()
      const speed = velocity.length()
      const colorMix = speed.div(maxSpeed).smoothstep(0, 1)
      If(uv().sub(0.5).length().greaterThan(0.5), () => {
        Discard()
      })
      return vec4(
        1,
        1,
        1,
        colorMix.mul(uv().sub(0.5).length().mul(2).oneMinus().pow(2))
      )
    })()

    material.scaleNode = particleMassMultiplier.mul(scale)

    // mesh

    const geometry = new PlaneGeometry(1, 1)
    const mesh = new InstancedMesh(geometry, material, count)
    return {
      mesh,
      geometry,
      material,
      updateCompute,
      attractorsPositions,
      attractorsRotationAxes
    }
  }, [])

  const noise = useMemo(() => {
    const noise = createNoise2D()
    return (x, y) => (noise(x, y) + 1) / 2
  }, [])
  const noise2 = useMemo(() => {
    const noise = createNoise2D()
    return (x, y) => (noise(x, y) + 1) / 2
  }, [])

  useFrame(({ clock }) => {
    renderer.compute(updateCompute)
    for (let i = 0; i < attractorsPositions.array.length; i++) {
      const v = attractorsPositions.array[i] as Vector3
      v.set(
        noise(i, clock.elapsedTime / 2),
        noise2(i, clock.elapsedTime / 2) * h,
        0
      )
      const v2 = attractorsRotationAxes.array[i] as Vector3
      v2.set(
        noise(i, clock.elapsedTime / 2 + 100) * 2 - 1,
        (noise2(i, clock.elapsedTime / 2 + 100) * 2 - 1) * h,
        0
      )
    }
  })

  useEffect(() => {
    scene.add(mesh)
    return () => {
      scene.remove(mesh)
      mesh.dispose()
      material.dispose()
      // geometry.dispose()
    }
  }, [])

  return <></>
}
