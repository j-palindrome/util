'use client'
import { useAsemic } from '@/util/src/asemic/Asemic'
import LineBrush from '@/util/src/asemic/LineBrush'
import StripeBrush from '@/util/src/asemic/StripeBrush'
import { gaussian } from '@/util/src/tsl/gaussian'
import { range } from 'lodash'
import { vec4 } from 'three/tsl'

export default function Lines() {
  const { h } = useAsemic()
  const count = 15
  return (
    <>
      {range(count).map(i => (
        <StripeBrush
          key={i}
          pointColor={(input, { uv }) => {
            return vec4(input.rgb, input.a.mul(gaussian(uv.y.sub(0.5))))
          }}
          renderInit
          onInit={g =>
            g
              .transform({
                scale: [1, h],
                translate: [g.getRange(i / (count - 1), [-0.8, 0.2]), 0],
                alpha: 1 / count
              })
              .repeat(2, ({ pComplete }) => {
                const index = g.hash()
                g.newCurve({ translate: [pComplete * 0.6, 0] }).repeat(
                  5,
                  ({ pComplete }) => {
                    g.newPoints([g.noise([index, g.time / 6]), pComplete])
                  }
                )
              })
          }
        />
      ))}
    </>
  )
}
