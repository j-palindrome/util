'use client'
// line that may or may not intersect

import Asemic from '@/util/src/asemic/Asemic'
import MeshBrush from '@/util/src/asemic/LineBrush'
import { afterImage } from '@/util/src/tsl/afterImage'
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js'
import { uv } from 'three/tsl'

// Inspired by brutalism
export default function Genuary23() {
  return (
    <Asemic
      postProcessing={input => {
        return bloom(input, 0.3).add(afterImage(input, 0.9))
        // return input.add(afterImage(input, 0.9))
      }}>
      {s => (
        <>
          <MeshBrush
            onInit={b => {
              if (b.time === 0) {
                b.newCurve([0, 0, { thickness: 2 }], [0.5, 0.5])
              }
              b.newPoints([
                0,
                0,
                {
                  translate: [Math.random(), Math.random() * s.h],
                  reset: true,
                  thickness: b.getRandomWithin(2, 60)
                }
              ])
              if (b.curves[0].length > 10) {
                b.curves[0].splice(0, 1)
              }
            }}
            renderInit={true}
            maxLength={1}
            maxPoints={50}
            adjustEnds={false}
          />
        </>
      )}
    </Asemic>
  )
}
