import {
  atan,
  atan2,
  cos,
  float,
  If,
  mat2,
  mix,
  PI2,
  pow,
  select,
  sin,
  vec2
} from 'three/tsl'

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

export const rotate2d = (
  v: ReturnType<typeof vec2>,
  a: number | ReturnType<typeof float>
) => {
  const s = sin(PI2.mul(a))
  const c = cos(PI2.mul(a))
  const m = mat2(c, s.mul(-1), s, c)
  return m.mul(v)
}

export const lineTangent = (
  p0: ReturnType<typeof vec2>,
  p1: ReturnType<typeof vec2>
) => {
  return rotate2d(p1.sub(p0), 0.25)
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
  return rotate2d(
    p1
      .sub(p0)
      .mul(float(2).mul(t.oneMinus()))
      .add(p2.sub(p1).mul(float(2).mul(t))),
    float(0.25)
  )
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

export const bezierPointSimple = ({ t, p0, p1, p2, strength }) => {
  const positionCurve = bezier2(t, p0, p1, p2)
  const positionStraight = polyLine({ t, p0, p1, p2 })
  const position = mix(positionCurve, positionStraight, strength)
  return position
}

export const multiBezierProgress = ({ t, controlPointsCount }) => {
  const subdivisions = float(controlPointsCount).sub(2)
  const start = t.mul(subdivisions).toInt()
  const cycle = t.mul(subdivisions).fract()
  return vec2(start, cycle)
}
