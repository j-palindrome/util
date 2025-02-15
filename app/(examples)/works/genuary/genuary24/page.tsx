'use client'

import Asemic from '@/asemic/src/Asemic'
import MeshBrush from '@/asemic/src/LineBrush'
import PointBrush from '@/asemic/src/DashBrush'
import { afterImage } from '@/util/src/tsl/afterImage'
import { gaussianBlur } from '@/util/src/tsl/effects'
import { screenUV, select, time, uv, vec2, vec4 } from 'three/tsl'

// Inspired by brutalism
export default function Genuary23() {
  return (
    <Asemic>
      {s => (
        <MeshBrush
          onInit={b => {
            b.repeat(10, () =>
              b.newShape(6, {
                reset: true,
                translate: [Math.random(), Math.random() * s.h],
                scale: 0.5,
                thickness: 10
              })
            )
          }}
          onUpdate={b => {
            b.curves.flat().forEach(p => (p.thickness = Math.random() * 100))
          }}
          renderInit={500}
          renderUpdate='cpu'
        />
      )}
    </Asemic>
  )
}
