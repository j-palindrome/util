'use client'
import Asemic from '@/util/src/asemic/Asemic'
import { hash } from 'crypto'
import { random } from 'lodash'
import { mul, mx_noise_float, time, triNoise3D, vec2, vec3 } from 'three/tsl'

export default function Page() {
  return (
    <Asemic
      dimensions={[1080, 1920]}
      builder={b =>
        b
          .newGroup({
            curveVert: (input, pointCurve, aspectRatio) =>
              input.add(
                vec2(
                  0,
                  mx_noise_float(
                    vec3(pointCurve, time.mul(0.25)),
                    pointCurve.x.remap(0, 1, 0.25, 1),
                    -0.5
                  ).mul(aspectRatio)
                )
              ),
            maxLength: 2,
            spacing: 5,
            thickness: 50,
            alpha: 0.2
          })
          .repeat(c => {
            b.newCurve()
            b.repeat((p, i) => {
              b.newPoints([-p, 0])
            }, 8)
          }, 10)
          .debug()
      }
    />
  )
}
