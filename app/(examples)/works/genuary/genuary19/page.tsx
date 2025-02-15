'use client'
import Asemic, { AsemicCanvas } from '@/asemic/src/Asemic'
import SceneBuilder from '@/asemic/src/Builder'
import { afterImage } from '@/util/src/tsl/afterImage'
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js'
import { hash, PI2, range, time, vec2, vec4 } from 'three/tsl'

const builder = (b: SceneBuilder) => {
  // b.newGroup(
  //   'attractors',
  //   g => {
  //     g.newCurve({ thickness: 100 })
  //     g.repeat(3, () => g.newPoints(g.getRandomWithin([0, 0], [1, g.h])))
  //   },
  //   { maxLength: 2, recalculate: false, update: true, spacing: 0.1 }
  // )
  b.newGroup(
    'line',
    g => {
      g.repeatGrid([10, 10], ({ p, i }) => {
        g.repeat(10, () => {
          g.newCurve()
          g.repeat(4, () =>
            g.newPoints([
              0,
              0,
              {
                thickness: 100,
                alpha: 0.1,
                translate: [i[0] + Math.random(), i[1] + Math.random()],
                reset: true
              }
            ])
          )
        })
      })
    },
    {
      update: true,
      curveVert: (input, { progress, height }) =>
        vec2(
          hash(input.x.mul(2).add(time.mul(10))),
          hash(input.y.mul(2).add(time.mul(10))).mul(height)
        ),
      maxLength: 2,
      spacing: 1
    }
  )
}
export default function Genuary18() {
  return (
    <Asemic
      builder={builder}
      settings={{
        postProcessing: input => {
          return input.add(bloom(input, 0.01))
        }
      }}
    />
  )
}
