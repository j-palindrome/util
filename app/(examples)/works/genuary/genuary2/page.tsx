'use client'
import Asemic from '@/util/src/asemic/Asemic'
import { random } from 'lodash'
import {
  hash,
  mul,
  mx_noise_float,
  time,
  triNoise3D,
  vec2,
  vec3
} from 'three/tsl'

export default function Page() {
  return (
    <Asemic
      dimensions={[1080, 1920]}
      builder={b =>
        b
          .group({
            curveVert: (input, pointCurve, aspectRatio) =>
              input.add(
                vec2(
                  0,
                  mx_noise_float(
                    vec3(
                      vec2(pointCurve.x, hash(pointCurve.y.mul(183)).mul(2910)),
                      time.mul(0.2)
                    ),
                    pointCurve.x.remap(0, 1, 0.25, 0.5),
                    -0.25
                  ).mul(aspectRatio)
                )
              ),
            // input,
            maxLength: 2,
            spacing: 200,
            spacingType: 'count',
            thickness: 1500,
            alpha: 0.002
          })
          .repeat(c => {
            b.newCurve()
            b.repeat((p, i) => {
              b.newPoints([p, -1])
            }, 8)
          }, 200)
          .debug()
      }
    />
  )
}
