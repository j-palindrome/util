import { Vector2 } from 'three'
import {
  atan,
  cos,
  float,
  If,
  mat2,
  mix,
  PI2,
  select,
  sin,
  vec2
} from 'three/tsl'

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

export const rotate2d = (
  v: ReturnType<typeof vec2>,
  a: number | ReturnType<typeof float>
) => {
  const s = sin(PI2.mul(a))
  const c = cos(PI2.mul(a))
  const m = mat2(c, s.mul(-1), s, c)
  return m.mul(v)
}

export const bezier2Tangent = ({
  t,
  p0,
  p1,
  p2
}: {
  t: ReturnType<typeof float>
  p0: ReturnType<typeof vec2>
  p1: ReturnType<typeof vec2>
  p2: ReturnType<typeof vec2>
}) => {
  return p1
    .sub(p0)
    .mul(float(2).mul(t.oneMinus()))
    .add(p2.sub(p1).mul(float(2).mul(t)))
}

export const polyLine = ({
  t,
  p0,
  p1,
  p2
}: {
  t: ReturnType<typeof float>
  p0: ReturnType<typeof vec2>
  p1: ReturnType<typeof vec2>
  p2: ReturnType<typeof vec2>
}) => {
  const l0 = p1.sub(p0).length().toVar()
  const l1 = p2.sub(p1).length().toVar()
  const splitPoint = float(0.5)
  // .add(l0.sub(l1).div(2))
  return select(
    t.greaterThan(splitPoint),
    mix(p1, p2, t.sub(splitPoint).div(splitPoint.oneMinus())),
    mix(p0, p1, t.div(splitPoint))
  )
}

// Define the Bezier functions
export const bezier2 = (t, p0, p1, p2) => {
  return p0
    .mul(t.oneMinus().pow(2))
    .add(p1.mul(t.oneMinus().mul(t).mul(2)))
    .add(p2.mul(t.pow(2)))
  // .div(
  //   t
  //     .oneMinus()
  //     .pow(2)
  //     .add(
  //       t
  //         .mul(2)
  //         .mul(t.oneMinus())
  //         .mul(float(1).add(float(strength).mul(2)))
  //         .add(t.pow(2))
  //     )
  // )
}

export const bezierRational = ({ t, p0, p1, p2, strength }) => {
  return p0
    .mul(t.oneMinus().pow(2))
    .add(p1.mul(t.oneMinus().mul(t).mul(2)).mul(float(strength).add(1)))
    .add(p2.mul(t.pow(2)))
    .div(
      t
        .oneMinus()
        .pow(2)
        .add(
          t
            .mul(2)
            .mul(t.oneMinus())
            .mul(float(1).add(float(strength).mul(2)))
            .add(t.pow(2))
        )
    )
}

export const bezierPosition = ({ t, p0, p1, p2, strength }) => {
  const position = vec2().toVar()
  If(strength.equal(1), () => {
    position.assign(polyLine({ t, p0, p1, p2 }))
  })
    .ElseIf(strength.equal(0), () => {
      position.assign(bezier2(t, p0, p1, p2))
    })
    .Else(() => {
      position.assign(bezierRational({ t, p0, p1, p2, strength }))
    })
  return position
}

// Function to calculate a point on a Bezier curve
export const bezierRotation = ({ t, p0, p1, p2, strength }) => {
  const tangent = bezier2Tangent({ t, p0, p1, p2 })
  const rotation = atan(tangent.y, tangent.x)
  return rotation
}
