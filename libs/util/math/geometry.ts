import { Vector2 } from 'three'
// export const lerpVectors = glsl `
// vec2 lerpVectors(vec2 a, vec2 b, float lerp) {
//   return a + (b - a) * lerp;
// }`

const bezierJS = (t: number, p0: Vector2, p1: Vector2, p2: Vector2) => {
  const tInverse = 1 - t
  const test = new Vector2()
  const test2 = new Vector2()
  return test
    .copy(p0)
    .multiplyScalar(tInverse ** 2)
    .add(test2.copy(p1).multiplyScalar(2 * tInverse * t))
    .add(test2.copy(p2).multiplyScalar(t ** 2))
}

export const multiBezierJS = (t: number, ...points: Vector2[]) => {
  const subdivisions = points.length - 2
  const progress = t * subdivisions // 0 -> numSubdivisions
  const startCurve = Math.floor(progress)
  const p1 = points[startCurve + 1]
  const p0 =
    startCurve > 1
      ? points[startCurve].clone().lerp(p1, 0.5)
      : points[startCurve]
  const p2 =
    startCurve === points.length - 3
      ? points[startCurve + 2].clone().lerp(p1, 0.5)
      : points[startCurve + 2]
  return bezierJS(progress % 1, p0, p1, p2)
}

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
