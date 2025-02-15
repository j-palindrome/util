'use client'
import Asemic, { AsemicCanvas } from '@/asemic/src/Asemic'
import SceneBuilder from '@/asemic/src/Builder'
import { afterImage } from '@/util/src/tsl/afterImage'
import { gaussianBlur } from '@/util/src/tsl/effects'
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js'
import { float, hash, PI2, range, time, vec2, vec4 } from 'three/tsl'

const builder = (b: SceneBuilder) => {
  b.newGroup(
    'attractors',
    g => {
      g.repeatGrid([2, 10], ({ i }) => {
        // if (i[0] % 2)
        if (i[0]) {
          g.transform({
            reset: true,
            rotate: 0.25,
            translate: [1, 0],
            scale: [g.globals.h, 1]
          })
        } else {
          g.transform({ reset: true, scale: [1, g.globals.h] })
        }
        g.newCurve(
          [
            0,
            0,
            {
              thickness: 1,
              translate: [0, Math.random()]
              // scale: [Math.random(), 1]
              // reset: true
            }
          ],
          [1, 0]
        )
      })
    },
    {
      update: true,
      // maxLength: 2,
      spacing: 20,
      recalculate: () => Math.random() * 500
    },
    {
      initialSpread: true,
      pointSize: 3,
      gravityForce: 0.5,
      damping: 0,
      // maxSpeed: 2,
      spinningForce: 0,
      pointPosition: position => {
        return vec2(position.x, position.y.div(0.03).round().mul(0.03))
      }
    }
  )
}
export default function Genuary18() {
  return (
    <Asemic
      builder={builder}
      settings={{
        postProcessing: input => {
          return afterImage(input.add(bloom(input, 0.1)), 0.7)
        }
      }}
    />
  )
}
