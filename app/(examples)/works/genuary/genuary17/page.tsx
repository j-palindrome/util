'use client'
import Asemic, { AsemicCanvas } from '@/util/src/asemic/Asemic'
import SceneBuilder from '@/util/src/asemic/Builder'

export default function Genuary16() {
  return (
    <AsemicCanvas dimensions={[1080, 1920]}>
      <Asemic
        builder={
          (b: SceneBuilder) =>
            b.newGroup(
              'dash',
              g =>
                g.newCurve(
                  [0.2, 0, { thickness: 70, alpha: 0.1 }],
                  [0.2, 1],
                  [1, 1],
                  [1, g.h]
                ),
              { spacing: 100 }
            )
          //           b.newGroup(
          //             'line',
          //             g =>
          //               g.text(
          //                 `circling above
          // more than eagles`,
          //                 {
          //                   center: 0.5,
          //                   width: 0.9,
          //                   middle: g.h * 0.5,
          //                   varyThickness: 5,
          //                   varyPosition: 90 / 1080
          //                 },
          //                 { thickness: 3 }
          //               ),
          //             { recalculate: 600 }
          //           )
        }
        settings={{}}
      />
    </AsemicCanvas>
  )
}
