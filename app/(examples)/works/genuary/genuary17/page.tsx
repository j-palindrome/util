'use client'
import Asemic, { AsemicCanvas } from '@/asemic/src/Asemic'
import SceneBuilder from '@/asemic/src/Builder'
import { afterImage } from '@/util/src/tsl/afterImage'
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js'
import { hash, PI2, range, time, vec2, vec4 } from 'three/tsl'

const builder = (b: SceneBuilder) => {
  b.newGroup(
    'line',
    g => {
      const noise = g.cycle(2.3) * 0.7
      const noise2 = g.cycle(2.7) * 0.7

      g.newCurve({
        translate: [0.5, 0.5 * g.h],
        scale: 0.001,
        thickness: 0.001
      })
      g.repeat(100, ({ p }) => {
        g.newPoints([
          1,
          0,
          {
            rotate: g.getRange(noise2, [-1 / 6, 1 / 6]),
            scale: 1.07 + noise,
            thickness: g.getRange(p, [0, 300], 2),
            alpha: g.getRange(p, [1, 0], 0.1)
          }
        ])
      })
    },
    { recalculate: true, maxLength: 2 }
  )
}
export default function Genuary16() {
  return (
    <AsemicCanvas dimensions={[1080, 1920]}>
      <Asemic
        builder={builder}
        settings={{
          postProcessing: input => {
            return input.add(afterImage(input, 0.8))
          }
        }}
      />
    </AsemicCanvas>
  )
}
