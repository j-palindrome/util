import * as THREE from 'three'
import {
  storage,
  If,
  vec3,
  not,
  uniform,
  uv,
  uint,
  float,
  Fn,
  vec2,
  abs,
  int,
  invocationLocalIndex,
  workgroupArray,
  uvec2,
  floor,
  instanceIndex,
  workgroupBarrier,
  atomicAdd,
  atomicStore,
  workgroupId,
  vec4
} from 'three/tsl'
import {
  MeshBasicNodeMaterial,
  StorageBufferAttribute,
  StorageInstancedBufferAttribute
} from 'three/webgpu'
import { WebGPURenderer } from 'three/src/Three.WebGPU.js'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { useHeight } from '@/util/src/asemic/util'

enum StepType {
  NONE,
  // Swap values within workgroup local buffer.
  FLIP_LOCAL,
  DISPERSE_LOCAL,
  // Swap values within global data buffer.
  FLIP_GLOBAL,
  DISPERSE_GLOBAL
}

const gridWidth = 1000
const gridHeight = 1
// Total number of elements and the dimensions of the display grid.
const size = gridWidth * gridHeight

// Total number of steps in a bitonic sort with 'size' elements.
const MAX_STEPS = gridWidth * 2
const WORKGROUP_SIZE = [64]

const effectController = {
  // Sqr root of 16834
  gridWidth: uniform(gridWidth),
  gridHeight: uniform(gridHeight),
  highlight: uniform(0),
  'Display Mode': 'Swap Zone Highlight'
}

// When forceGlobalSwap is true, force all valid local swaps to be global swaps.
export function init(forceGlobalSwap = false) {
  let currentStep = useRef(0)
  let nextStepGlobal = false

  const nextAlgoBuffer = new StorageInstancedBufferAttribute(
    new Uint32Array(1).fill(
      forceGlobalSwap ? StepType.FLIP_GLOBAL : StepType.FLIP_LOCAL
    ),
    1
  )

  const nextAlgoStorage = storage(nextAlgoBuffer, 'uint', nextAlgoBuffer.count)
    .setPBO(true)
    .label('NextAlgo')

  const nextBlockHeightBuffer = new StorageInstancedBufferAttribute(
    new Uint32Array(1).fill(2),
    1
  )
  const nextBlockHeightStorage = storage(
    nextBlockHeightBuffer,
    'uint',
    nextBlockHeightBuffer.count
  )
    .setPBO(true)
    .label('NextBlockHeight')
  const nextBlockHeightRead = storage(
    nextBlockHeightBuffer,
    'uint',
    nextBlockHeightBuffer.count
  )
    .setPBO(true)
    .label('NextBlockHeight')
    .toReadOnly()

  const highestBlockHeightBuffer = new StorageInstancedBufferAttribute(
    new Uint32Array(1).fill(2),
    1
  )
  const highestBlockHeightStorage = storage(
    highestBlockHeightBuffer,
    'uint',
    highestBlockHeightBuffer.count
  )
    .setPBO(true)
    .label('HighestBlockHeight')

  const counterBuffer = new StorageBufferAttribute(1, 1)
  const counterStorage = storage(counterBuffer, 'uint', counterBuffer.count)
    .setPBO(true)
    .toAtomic()
    .label('Counter')

  const array = new Uint32Array(
    Array.from({ length: size }, (_, i) => {
      return i
    })
  )
  for (let i = 0; i < array.length; i++) {
    const randIndex1 = Math.floor(Math.random() * array.length)
    const randIndex2 = Math.floor(Math.random() * array.length)
    const temp = array[randIndex1]
    array[randIndex1] = array[randIndex2]
    array[randIndex2] = temp
  }

  const currentElementsBuffer = new StorageInstancedBufferAttribute(array, 1)
  const currentElementsStorage = storage(currentElementsBuffer, 'uint', size)
    .setPBO(true)
    .label('Elements')
  const tempBuffer = new StorageInstancedBufferAttribute(array, 1)
  const tempStorage = storage(tempBuffer, 'uint', size)
    .setPBO(true)
    .label('Temp')
  const randomizedElementsBuffer = new StorageInstancedBufferAttribute(size, 1)
  const randomizedElementsStorage = storage(
    randomizedElementsBuffer,
    'uint',
    size
  )
    .setPBO(true)
    .label('RandomizedElements')

  const computeResetBuffersFn = Fn(() => {
    currentElementsStorage
      .element(instanceIndex)
      .assign(randomizedElementsStorage.element(instanceIndex))
  })

  // Initialize each value in the elements buffer.

  // Reset the buffers and algorithm information after a full bitonic sort has been completed.
  const computeResetBuffers = computeResetBuffersFn().compute(size)

  const material = new MeshBasicNodeMaterial({ color: 0x00ff00 })

  const display = Fn(() => {
    const { gridWidth, gridHeight, highlight } = effectController

    const newUV = uv().mul(vec2(gridWidth, gridHeight))

    const pixel = uvec2(uint(floor(newUV.x)), uint(floor(newUV.y)))

    const elementIndex = uint(gridWidth).mul(pixel.y).add(pixel.x)

    const colorChanger = currentElementsStorage.element(elementIndex)

    const subtracter = float(colorChanger).div(gridWidth.mul(gridHeight))

    const color = vec3(subtracter.oneMinus()).toVar()

    return color
  })

  material.colorNode = display()
  const scene = useThree(state => state.scene)

  const h = useHeight()
  useEffect(() => {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, h), material)
    plane.position.set(0.5, 0.5 * h, 0)
    scene.add(plane)
    return () => {
      scene.remove(plane)
    }
  }, [])

  const index = uniform(0)
  const computeSort = Fn(() => {
    const thisElement = currentElementsStorage.element(
      instanceIndex.mul(2).add(index)
    )
    const nextElement = currentElementsStorage.element(
      instanceIndex.mul(2).add(index).add(1)
    )
    If(nextElement.lessThan(thisElement), () => {
      const temp = nextElement.toVar()
      nextElement.assign(thisElement)
      thisElement.assign(temp)
    })
  })().compute(size / 2)

  // @ts-ignore
  const renderer = useThree(state => state.gl as WebGPURenderer)

  useFrame(async () => {
    if (currentStep.current < MAX_STEPS) {
      renderer.compute(computeSort)
      currentStep.current++
      index.value = index.value ? 0 : 1
      index.needsUpdate = true
    } else {
      renderer.compute(computeResetBuffers)
      currentStep.current = 0
    }
  })

  // timestamps[forceGlobalSwap ? 'global_swap' : 'local_swap'].innerHTML = `

  //   Compute ${forceGlobalSwap ? 'Global' : 'Local'}: ${renderer.info.compute.frameCalls} pass in ${renderer.info.compute.timestamp.toFixed(6)}ms<br>
  //   Total Swaps: ${totalSwaps}<br>
  //     <div style="display: flex; flex-direction:row; justify-content: center; align-items: center;">
  //       ${forceGlobalSwap ? 'Global Swaps' : 'Local Swaps'} Compare Region&nbsp;
  //       <div style="background-color: ${forceGlobalSwap ? globalColors[0] : localColors[0]}; width:12.5px; height: 1em; border-radius: 20%;"></div>
  //       &nbsp;to Region&nbsp;
  //       <div style="background-color: ${forceGlobalSwap ? globalColors[1] : localColors[1]}; width:12.5px; height: 1em; border-radius: 20%;"></div>
  //     </div>`
}
