'use client'
import { useAsemic } from '@/util/src/asemic/Asemic'
import BlobBrush from '@/util/src/asemic/BlobBrush'
// line that may or may not intersect
import { toTuple } from '@/util/src/asemic/typeGuards'
import { Vector2 } from 'three'
import LineBrush from '@/util/src/asemic/LineBrush'
import PointBrush from '@/util/src/asemic/DashBrush'

// grid-based graphic design
export default function Genuary30() {
  const { h, mouse } = useAsemic()

  return (
    <PointBrush
      params={{ grid: toTuple(10, 10 * h) }}
      renderInit
      spacing={20}
      onInit={b => {
        b.repeatGrid([3, 3 * h], ({ p, count, pCenter, iNumber }) => {
          b.transform({
            reset: true,
            push: true,
            translate: pCenter
              .multiply({ x: 1, y: h })
              .add(
                b.vec2
                  .set(
                    b.noise([p.x, iNumber, b.time / 10], { signed: true }),
                    b.noise([p.x, iNumber, b.time / 10], { signed: true })
                  )
                  .multiplyScalar(0.1)
              ),
            scale:
              (1 / count.x) * b.getRange(b.noise([iNumber, b.time / 5]), [1, 3])
          })
            .newCurve()
            .repeat(7, ({ p: p2, pComplete, count }) =>
              b.newPoints([
                0,
                1,
                {
                  rotate: p2,
                  reset: 'last',
                  scale: b.noise([p2, b.time * 0.3]),
                  thickness: b.getRange(
                    b.noise([p2, b.time * 0.3], { advance: false }),
                    [1, 12]
                  )
                }
              ])
            )
            .transform({ reset: 'pop' })
        })
      }}
      adjustEnds='loop'
    />
  )
}
