'use client'
// line that may or may not intersect
import Asemic from '@/asemic/src/Asemic'
import MeshBrush from '@/asemic/src/LineBrush'
import { bezier2 } from '@/util/src/tsl/curves'
import { positionLocal, vec2, vec4 } from 'three/tsl'

export default function Genuary26() {
  const words = [
    'scroll',
    'to',
    'one',
    'moment',
    'without',
    'unrecognized',
    'feature',
    'length',
    'composite',
    'organization',
    'memory',
    'unsettled',
    'lengthwise',
    'underfit',
    'overenrolled',
    'altogether',
    'forlorn',
    'mismanaged'
  ]
  return (
    <Asemic>
      {s =>
        words.map((word, i) => (
          <MeshBrush
            key={i}
            renderInit
            params={{ index: 0, lastTime: 0 }}
            onInit={b => {
              if (b.time === 0) {
                b.newText(
                  word,
                  { varyThickness: 4 },
                  {
                    scale: 1 / 10,
                    translate: [0, -0.2 + i * -0.2],
                    thickness: 3,
                    alpha: Math.random()
                  }
                )
              } else {
                b.curves.flat().forEach(p =>
                  p.add({
                    x: 0,
                    y: 3 * b.hash(b.params.index) * (b.time - b.params.lastTime)
                  })
                )
                if (b.curves[0][0].y > s.h) {
                  b.params.index++
                  b.curves.flat().forEach(p => {
                    p.sub({ x: 0, y: s.h + 0.2 })
                    p.alpha = b.hash(b.params.index)
                  })
                }
                b.params.lastTime = b.time
              }
            }}
            pointColor={p => {
              return vec4(
                p.xyz,
                bezier2(
                  positionLocal.y.div(s.h),
                  vec2(0, 0),
                  vec2(0.5, 2),
                  vec2(1, 0)
                )
                  .y.pow(3)
                  .mul(p.a)
              )
            }}
          />
        ))
      }
    </Asemic>
  )
}
