'use client'
import Asemic from '@/asemic/src/Asemic'
import { Vector2, Vector3 } from 'three'
import { hash, range, time, vec4 } from 'three/tsl'

export default function Tests() {
  return (
    <Asemic
      height={1920}
      width={1080}
      className='bg-black'
      builder={
        b =>
          b
            .group({
              curveVert: (input, pointCurve) =>
                input.add(
                  vec4(
                    hash(range(0, 1).mul(100).add(time.mul(0.5))),
                    pointCurve.y.add(time.mul(0.1)).mod(1),
                    0,
                    0
                  )
                )
            })
            .newCurvesBlank(50, 2)
            .newGroup({
              curveVert: (input, pointCurve) =>
                input.add(
                  vec4(
                    pointCurve.y,
                    hash(range(0, 1).mul(100).add(time.mul(0.5)))
                      .sub(time.mul(0.1))
                      .mod(1),
                    0,
                    0
                  )
                )
            })
            .newCurvesBlank(50, 2)
        // .repeat(() => b.newCurve([0, 0], [1, 0]), 10)
        // .newGroup({
        //   curveVert: (input, { tPoint }) =>
        //     input.add(vec4(tPoint, range(0, 1), 0, 0)),
        //   curveFrag: input =>
        //     vec4(range(new Vector3(0, 0, 0), new Vector3(1, 1, 1)), 1),
        //   maxLength: 2
        // })
        // .newCurvesBlank(3, 5)
      }
    />
  )
}
