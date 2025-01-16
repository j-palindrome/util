'use client'
import Asemic, { AsemicCanvas } from '@/util/src/asemic/Asemic'
import { scale } from '@/util/src/math'
import { now } from 'lodash'

import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js'
import { floor, Fn, PI2, range, select, vec4 } from 'three/tsl'

export default function Genuary14() {
  return (
    <AsemicCanvas dimensions={[1080, 1920]}>
      <Asemic
        builder={b =>
          b.transform({ recalculate: true }).newGroup('dash', g => {
            g.transformBrush({
              gap: 50,
              pointRotate: input =>
                range(0, 1).mul(PI2.mul(0.05)).add(-0.2).add(PI2.div(-4))
            })
            g.transform({
              align: 0,
              spacing: 3,
              scale: [1, g.h],
              push: true,
              alpha: 1 / 128
            })

            g.repeat(300, ({ i }) =>
              g.newCurve(
                [
                  0,
                  g.noise([g.time * 0.5, g.hash(), i]),
                  {
                    thickness: 1920 * 1.1,
                    reset: 'last',
                    scale: [1, g.toRange(g.hash(), [0.1, 0.2])],
                    translate: [g.toRange(g.hash(), [0, 0.1]), -0.1]
                  }
                ],
                [0.5, g.noise([g.time * 0.5, g.hash(), i])],
                [1, g.noise([g.time * 0.5, g.hash(), i])]
              )
            )
          })
        }
      />
    </AsemicCanvas>
  )
}
