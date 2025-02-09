import { Vector2 } from 'three'
export const bezier2JS = (
  t: number,
  p0: [number, number],
  p1: [number, number],
  p2: [number, number]
) => {
  const tInverse = 1 - t
  return new Vector2(...p0)
    .clone()
    .multiplyScalar(tInverse ** 2)
    .add(new Vector2(...p1).multiplyScalar(2 * tInverse * t))
    .add(new Vector2(...p2).multiplyScalar(t * t))
}

export function shape(type: 'square') {
  const sourceTypes = {
    square: [-1, 1, 1, 1, -1, -1, -1, -1, 1, 1, 1, -1]
  }
  return sourceTypes[type]
}

export function polToCar(r: number, theta: number) {
  theta = Math.PI * 2 * theta
  return [r * Math.sin(theta), r * Math.cos(theta)]
}

export function ellipse(rx: number, ry: number, theta: number) {
  theta = Math.PI * 2 * theta
  return [rx * Math.sin(theta), ry * Math.cos(theta)]
}

export const toAngle = (point: number[]) => Math.atan2(point[0], point[1])

export function arcTangent(t: number, r: number | [number, number]) {
  return [
    Math.cos(t) * (typeof r === 'number' ? r : r[0]),
    -1 * Math.sin(t) * (typeof r === 'number' ? r : r[1])
  ]
}

export function arc(
  t: number,
  center: [number, number],
  r: number | [number, number]
) {
  return [
    center[0] + Math.sin(t) * (typeof r === 'number' ? r : r[0]),
    center[1] + Math.cos(t) * (typeof r === 'number' ? r : r[1])
  ]
}

export function bezierCurve() {}
