import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

export const groupArrayBy = (
  array: THREE.TypedArray | number[],
  groupSize: number,
) => {
  const groups: number[][] = []
  let thisGroup: number[] = []
  for (let item of array) {
    thisGroup.push(item)
    if (thisGroup.length === groupSize) {
      groups.push(thisGroup)
      thisGroup = []
    }
  }
  return groups
}

export const updateInstanceAttribute = (
  attribute: THREE.InstancedBufferAttribute,
  instanceNumber: number,
  update: (array: THREE.TypedArray) => THREE.TypedArray | number[],
) => {
  const arrayIndex = instanceNumber * attribute.itemSize
  const endIndex = arrayIndex + attribute.itemSize
  const array = attribute.array.slice(arrayIndex, endIndex)
  const newArray = update(array)
  // console.log('updating', attribute, newArray, arrayIndex, array.length)

  attribute.array.set(newArray, arrayIndex)
  attribute.addUpdateRange(arrayIndex, endIndex)
}

export const randomList = (length: number) =>
  _.range(length).map(() => Math.random())

export function toVector3(points: Pt): THREE.Vector3
export function toVector3(points: Pt[]): THREE.Vector3[]
export function toVector3<T extends Pt[] | Pt>(points: T) {
  if (points instanceof Array)
    return points.map((val) => new THREE.Vector3(...val.toArray()))
  else return new THREE.Vector3(...points.toArray())
}

export const initScene = (
  state: Parameters<NonNullable<Parameters<typeof useThree>[0]>>[0],
) => {
  const aspectRatio = window.innerWidth / window.innerHeight
  state.scene.clear()
  state.camera = new THREE.OrthographicCamera(
    -aspectRatio,
    aspectRatio,
    1,
    -1,
    0,
    1,
  )
  state.camera.position.set(0, 0, 0)
  state.camera.updateMatrixWorld()
  return { aspectRatio }
}

export const measureCurvature = (
  v0: THREE.Vector3,
  v1: THREE.Vector3,
  v2: THREE.Vector3,
  t: number,
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
        .multiplyScalar(t),
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
        [0, 0, 1],
      ]),
    ) *
      4) /
    (func.length() * 3)
  )
}
