import * as THREE from 'three'
import {
  atan,
  cos,
  float,
  max,
  min,
  mix,
  PI,
  PI2,
  sin,
  vec2,
  vec3,
  color,
  Fn,
  hash,
  hue,
  If,
  instanceIndex,
  Loop,
  mx_fractal_noise_float,
  mx_fractal_noise_vec3,
  pass,
  pcurve,
  storage,
  deltaTime,
  time,
  uv,
  uniform,
  atan2,
  vec4
} from 'three/tsl'
import { bloom } from 'three/addons/tsl/display/BloomNode.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'
import {
  MeshBasicNodeMaterial,
  MeshStandardNodeMaterial,
  PostProcessing,
  SpriteNodeMaterial,
  StorageBufferAttribute,
  StorageInstancedBufferAttribute,
  WebGPURenderer
} from 'three/webgpu'

let camera, scene, renderer, postProcessing, controls, clock, light

let updateParticles, spawnParticles // TSL compute nodes
let getInstanceColor // TSL function

const screenPointer = new THREE.Vector2()
const scenePointer = new THREE.Vector3()
const raycastPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
const raycaster = new THREE.Raycaster()

const MAX_INSTANCE_COUNT = 1000

const timeScale = uniform(1.0)
const particleLifetime = uniform(0.5)
const particleSize = uniform(0.05)
const linksWidth = uniform(0.005)

const colorOffset = uniform(0.0)
const colorVariance = uniform(2.0)
const colorRotationSpeed = uniform(1.0)

const spawnIndex = uniform(0)
const nbToSpawn = uniform(5)
const spawnPosition = uniform(vec3(0.0))
const previousSpawnPosition = uniform(vec3(0.0))

const turbFrequency = uniform(0.5)
const turbAmplitude = uniform(0.5)
const turbOctaves = uniform(2)
const turbLacunarity = uniform(2.0)
const turbGain = uniform(0.5)
const turbFriction = uniform(0.01)

export function init() {
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 100)
  camera.position.set(0, 0, 1)

  scene = new THREE.Scene()

  clock = new THREE.Clock()

  // renderer

  renderer = new WebGPURenderer({ antialias: true })
  renderer.setClearColor(0x14171a)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setAnimationLoop(animate)
  document.body.appendChild(renderer.domElement)

  // TSL function
  // current color from index
  getInstanceColor = /*#__PURE__*/ Fn(([i]) => {
    return hue(
      color(0x0000ff),
      colorOffset.add(
        mx_fractal_noise_float(i.toFloat().mul(0.1), 2, 2.0, 0.5, colorVariance)
      )
    )
  })

  // Particles
  // storage buffers
  const curveProgress = storage(
    new StorageInstancedBufferAttribute(MAX_INSTANCE_COUNT, 2),
    'vec2',
    MAX_INSTANCE_COUNT
  )

  // init particles buffers
  renderer.computeAsync(
    /*#__PURE__*/ Fn(() => {
      curveProgress
        .element(instanceIndex)
        .xy.assign(
          vec2(
            instanceIndex.toFloat().div(MAX_INSTANCE_COUNT),
            instanceIndex.toFloat().div(MAX_INSTANCE_COUNT)
          )
        )
      return undefined as any
    })().compute(MAX_INSTANCE_COUNT, undefined as any)
  )

  // particles output
  const particleGeom = new THREE.PlaneGeometry()

  const material = new SpriteNodeMaterial()
  material.positionNode = Fn(() => {
    // @ts-ignore
    const t = curveProgress.toAttribute()
    return vec3(t.xy, 0)
  })()
  material.transparent = true
  material.blending = THREE.AdditiveBlending
  material.depthWrite = false

  material.scaleNode = vec2(particleSize)
  material.rotationNode = float(0)

  material.colorNode = /*#__PURE__*/ vec3(1, 1, 1)
  material.opacityNode = float(1)

  const particleMesh = new THREE.InstancedMesh(
    particleGeom,
    material,
    MAX_INSTANCE_COUNT
  )
  // particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  // particleMesh.frustumCulled = false

  scene.add(particleMesh)

  // controls
  window.addEventListener('resize', onWindowResize)

  // pointer handling

  window.addEventListener('pointermove', onPointerMove)
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth, window.innerHeight)
}

function onPointerMove(e) {
  screenPointer.x = (e.clientX / window.innerWidth) * 2 - 1
  screenPointer.y = -(e.clientY / window.innerHeight) * 2 + 1
}

function updatePointer() {
  raycaster.setFromCamera(screenPointer, camera)
  raycaster.ray.intersectPlane(raycastPlane, scenePointer)
}

function animate() {
  // compute particles

  // update particle index for next spawn
  spawnIndex.value = (spawnIndex.value + nbToSpawn.value) % MAX_INSTANCE_COUNT

  // update raycast plane to face camera
  raycastPlane.normal.applyEuler(camera.rotation)
  updatePointer()

  // lerping spawn position
  // @ts-ignore
  previousSpawnPosition.value.copy(spawnPosition.value)
  // @ts-ignore
  spawnPosition.value.lerp(scenePointer, 0.1)

  // rotating colors
  colorOffset.value +=
    clock.getDelta() * colorRotationSpeed.value * timeScale.value

  const elapsedTime = clock.getElapsedTime()

  renderer.render(scene, camera)
  // postProcessing.render()
}
