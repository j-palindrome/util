import _ from 'lodash'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import * as math from 'mathjs'
import { useThree } from '@react-three/fiber'
import { Pt } from 'pts'

export const toVector3 = (...args: Pt[]) => {
  return args.map(val => new THREE.Vector3(...val.toArray()))
}

export const probLog = (prob: number, ...args: any[]) => {
  if (Math.random() < prob) {
    console.log(...args)
  }
}

export const initScene = (
  state: Parameters<NonNullable<Parameters<typeof useThree>[0]>>[0]
) => {
  const aspectRatio = window.innerWidth / window.innerHeight
  state.scene.clear()
  state.camera = new THREE.OrthographicCamera(
    -aspectRatio,
    aspectRatio,
    1,
    -1,
    0,
    1
  )
  state.camera.position.set(0, 0, 0)
  state.camera.updateMatrixWorld()
}

export const useEventListener = <K extends keyof WindowEventMap>(
  listener: K,
  func: (data: WindowEventMap[K]) => void,
  dependencies: any[] = []
) => {
  useEffect(() => {
    window.addEventListener(listener, func)
    return () => window.removeEventListener(listener, func)
  }, dependencies)
}

export const useInterval = (
  interval: () => void,
  intervalTime: number,
  dependencies: any[] = []
) => {
  useEffect(() => {
    const intervalIndex = window.setInterval(interval, intervalTime)
    return () => window.clearInterval(intervalIndex)
  }, dependencies)
}

export const rad = (progress: number) => progress * Math.PI * 2

export const scale = <T extends number | number[]>(
  input: T,
  low: number,
  high: number,
  lowOut: number,
  highOut: number,
  exp: number = 1,
  clamp = true
): T => {
  const scaleNumber = (input: number) => {
    if (high === low) return lowOut
    const zTo1 = ((input - low) / (high - low)) ** exp
    let final = zTo1 * (highOut - lowOut) + lowOut
    if (clamp && final > Math.max(lowOut, highOut)) return highOut
    if (clamp && final < Math.min(lowOut, highOut)) return lowOut
    return final
  }
  if (input instanceof Array) {
    return input.map(value => scaleNumber(value)) as T
  } else {
    return scaleNumber(input) as T
  }
}

export const create = <T>(e: T, onCreate: (argument: T) => void) => {
  onCreate(e)
  return e
}

export const useMemoCleanup = <T>(
  create: () => T,
  cleanup: (item: T) => void,
  deps: any[] = []
) => {
  const itemRef = useRef<T | null>(null)
  const item = useMemo(() => {
    if (itemRef.current) {
      cleanup(itemRef.current)
      itemRef.current = null
    }
    return create()
  }, deps)
  itemRef.current = item
  return item
}

export const measureCurvature = (
  v0: THREE.Vector3,
  v1: THREE.Vector3,
  v2: THREE.Vector3,
  t: number
) => {
  const func = v0
    .clone()
    .multiplyScalar(1 - t)
    .add(v1.clone().multiplyScalar(t))
    .multiplyScalar(1 - t)
    .add(
      v1
        .clone()
        .multiplyScalar(1 - t)
        .add(v2.clone().multiplyScalar(t))
        .multiplyScalar(t)
    )

  // from https://math.stackexchange.com/questions/220900/bezier-curvature

  // const firstDerivative = v1
  //   .sub(v0)
  //   .multiplyScalar(2 * (1 - t))
  //   .add(v2.sub(v1).multiplyScalar(2 * t))

  // const secondDerivative = v2
  //   .sub(v1.multiplyScalar(2).add(v0))
  //   .multiplyScalar(2)

  return (
    (math.det(
      math.matrix([
        v1.clone().sub(v0).toArray(),
        v2.clone().sub(v1).toArray(),
        [0, 0, 1]
      ])
    ) *
      4) /
    (func.length() * 3)
  )
}
