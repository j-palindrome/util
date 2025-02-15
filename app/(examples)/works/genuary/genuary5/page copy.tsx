'use client'
import Asemic from '@/asemic/src/Asemic'
import {
  mx_noise_float,
  mx_noise_vec3,
  PI,
  range,
  time,
  uv,
  vec2,
  vec3,
  vec4
} from 'three/tsl'

export default function Genuary5() {
  return (
    <Asemic
      dimensions={[1080, 1920]}
      builder={b =>
        b.newGroup(g =>
          g
            .set({
              gap: 0,
              spacing: 1,
              resample: false,
              thickness: 10,
              update: true,
              alpha: 0.1,
              pointRotate: input => input.add(range(0, 3.14)),
              pointVert: input => input,
              curveVert: (input, pointCurve) =>
                vec4(
                  mx_noise_vec3(
                    vec3(
                      pointCurve
                        .mul(100)
                        .add(vec2(range(0, 1), range(60, 1)))
                        .add(vec2(time.mul(0.1), time.mul(60.1)))
                    ),
                    1,
                    0
                  ).xy.add(vec2(0.5, g.h / 2)),
                  input.zw
                ),
              maxLength: 1
            })
            .newCurvesBlank(100, 5)
        )
      }
    />
  )
}
