'use client'
import Asemic, { AsemicCanvas } from '@/util/src/asemic/Asemic'
import { scale } from '@/util/src/math'
import { waveform } from '@/util/src/math/functions'
import { now } from 'lodash'
import {
  time,
  uv,
  vec2,
  vec3,
  vec4,
  mx_noise_float,
  PI2,
  select,
  length,
  ivec2,
  vertexIndex
} from 'three/tsl'

export default function Genuary12() {
  return (
    <AsemicCanvas dimensions={[1080, 1920]}>
      <Asemic
        builder={b => {
          b.transform({
            // vec4(1, 1, 0, 0)
          })
          // b.newGroup(g =>
          //   g.newCurve([0, 0.5, { thickness: 10 }], [1, 0.5, { thickness: 10 }])
          // )
          b.repeat(100, ({ i, p, count }) => {
            b.newGroup(g => {
              g.transform({
                recalculate: true,
                thickness: 2,
                translate: [p, p * g.h],
                pointFrag: (input, info) =>
                  vec4(
                    1,
                    1,
                    1,
                    1
                    // select(
                    //   uv().x.lessThan(time.mul(3).sin().add(1).div(4)),
                    //   1,
                    //   0
                    // )
                  )
              })
                .newCurve(
                  [0, 0, { thickness: 0 }],
                  [
                    0,
                    g.h - g.currentTransform.translate.y,
                    { thickness: (1080 / count) * waveform(now() / 1000) }
                  ]
                )
                .newCurve(
                  [0, 0, { translate: [0, (1 / count) * g.h], thickness: 0 }],
                  [
                    1 - g.currentTransform.translate.x,
                    0,
                    { thickness: (1920 / count) * waveform(now() / 1000) }
                  ]
                )
            })
          })
        }}
      />
    </AsemicCanvas>
  )
}
