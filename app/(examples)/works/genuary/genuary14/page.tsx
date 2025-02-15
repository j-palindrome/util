'use client'
import Asemic, { AsemicCanvas } from '@/asemic/src/Asemic'

import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js'
import { floor, Fn, select, vec4 } from 'three/tsl'

export default function Genuary14() {
  return (
    <AsemicCanvas dimensions={[1080, 1920]}>
      <Asemic
        builder={b =>
          b.transform({ thickness: 100, alpha: 0.01 }).newGroup(
            'line',
            g => {
              g.repeat(50, () => {
                g.newCurve([Math.random(), 0], [Math.random(), g.h])
              })
            },
            {
              renderInit: 50
            }
          )
        }
        settings={{
          postProcessing: (input, scenePass) => {
            return Fn(() => {
              return vec4(floor(input.x.mul(19234).mod(2)))
            })()
          }
        }}
      />
    </AsemicCanvas>
  )
}
