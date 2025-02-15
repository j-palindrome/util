'use client'
import Asemic from '@/asemic/src/Asemic'
import { random } from 'lodash'
import {
  float,
  mx_noise_float,
  mx_noise_vec3,
  PI,
  range,
  select,
  time,
  uv,
  vec2,
  vec3,
  vec4
} from 'three/tsl'

export default function Genuary5() {
  const recalculate = 3000
  const pointFrag = (p: number) => (input, textureVector) =>
    vec4(
      input.xyz,
      select(
        time
          .sub((p * recalculate) / 1000)
          .mod(recalculate / 1000)
          .remap(0, 1, 0, 2)
          .greaterThan(textureVector.x)
          .and(
            time
              .sub((p * recalculate) / 1000)
              .mod(recalculate / 1000)
              .remap(0, 1, -1, 1)
              .lessThan(textureVector.x)
          ),
        float(0.5).mul(textureVector.x.oneMinus().pow(3)),
        0
      )
    )
  const count = 30
  return (
    <Asemic
      dimensions={[1080, 1920]}
      builder={b =>
        b
          .set({
            recalculate,
            strength: 1,
            update: false
          })
          .repeat(count, p => {
            b.newGroup(g => {
              g.repeat(20, (_, i) => {
                g.newCurve().set({
                  start: p * recalculate,
                  pointFrag: pointFrag(p)
                })

                let grid = random(5)
                g.transform({
                  reset: true,
                  scale: [1 / 5, (1 / 23) * g.h]
                })
                  .transform({ translate: [grid, i % 2 ? 0 : 1] })
                  .transform({
                    translate: g.applyTransform(
                      g.getRandomAlong(
                        [0, 0],
                        Math.random() > 0.5 ? [1, 1] : [-1, 1]
                      ),
                      g.currentTransform,
                      true
                    )
                  })
                  .repeat(23, (p, i) => {
                    g.newPoints([0, 0], [0, 1]).transform({
                      translate: [Math.random() > 0.5 ? -1 / 2 : 1 / 2, 1.5]
                    })
                  })
              })
            })
          })
      }
    />
  )
}
