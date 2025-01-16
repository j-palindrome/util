'use client'
import Asemic from '@/util/src/asemic/Asemic'
import { PointBuilder } from '@/util/src/asemic/PointBuilder'
import { random } from 'lodash'
import { Vector2 } from 'three'
import { mix, time } from 'three/tsl'

export default function Genuary6() {
  const poem = 'some trees these are amazing'
  return (
    <Asemic
      dimensions={[1080, 1920]}
      builder={b => {
        b.transform({
          recalculate: 1000,
          update: true,
          curveVert: (input, info) => {
            return mix(info.lastPosition, input, time.fract())
          }
        }).newGroup(g => {
          g.repeat(1, () => {
            g.repeat(10, ({ i }) => {
              g.newCurve([0, 0], [Math.random(), 1])
            })
          })
        })
      }}
    />
  )
}
