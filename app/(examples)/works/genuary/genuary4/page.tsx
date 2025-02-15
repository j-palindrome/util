'use client'
import Asemic from '@/asemic/src/Asemic'
import { randomString } from '@/util/src/strings/strings'
import { sample } from 'lodash'
import { mx_noise_float } from 'three/src/nodes/TSL.js'
import { hash, time, vec2, vec3, vec4, range } from 'three/tsl'

export default function Page() {
  return (
    <Asemic
      style={{
        backgroundColor: 'rgb(16, 16, 16)'
      }}
      dimensions={[1080, 1920]}
      builder={b =>
        b.group(g =>
          g
            .set({
              update: true,
              curveFrag: color => vec4(0, 0, 0, 0.5),
              curveVert: (position, pointCurve) =>
                vec4(
                  position.xyz,
                  position.w.mul(
                    hash(range(0, 100).add(time.mul(25))).mul(1920 / 1)
                  )
                )
            })
            .repeat(4, y => {
              g.curve().repeat(200, x => g.points([x, y * g.h]))
            })
        )
      }
    />
  )
}
