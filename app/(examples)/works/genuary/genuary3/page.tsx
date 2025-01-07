'use client'
import Asemic from '@/util/src/asemic/Asemic'
import { randomString } from '@/util/src/strings/strings'
import { range } from 'lodash'
import { mx_noise_float } from 'three/src/nodes/TSL.js'
import { time, vec2, vec3, vec4 } from 'three/tsl'

export default function Page() {
  const strings = range(42).map(x => randomString(42))
  return (
    <Asemic
      dimensions={[1080, 1920]}
      builder={b =>
        // b.repeat(
        //   (p, i) =>
        //     b.newGroup(g => {
        //       g.transform({
        //         translate: [0, 0.5],
        //         scale: 1 / 6
        //       })
        //         .text('stahp')
        //         // .newCurve([0, 0, { reset: true }], [0.5, 0], [1, 0.5], [0, 0])
        //         .set({
        //           maxLength: 2 / 6,
        //           spacing: 30,
        //           gap: 10
        //           // recalculate: 100,
        //         })
        //     }),
        //   1
        // )
        b.repeat(
          (p, i) =>
            b.newGroup(g => {
              let newString = strings[i].split('')
              for (let i = 0; i < 3; i++) {
                newString[Math.floor(Math.random() * strings[i].length)] =
                  'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]
              }
              strings[i] = newString.join('')
              g.transform({
                translate: [0, (g.h * p * 41) / 42 + g.h / 42 / 2],
                scale: 1 / 32
              })
                .text(strings[i])
                .set({
                  spacing: 1,
                  recalculate: 100,
                  maxLength: 0.1
                })
            }),
          42
        )
      }
    />
  )
}
