'use client'
// line that may or may not intersect

import Asemic from '@/asemic/src/Asemic'
import ParticlesBrush from '@/asemic/src/ParticlesBrush'
import StripeBrush from '@/asemic/src/StripeBrush'
import MeshBrush from '@/asemic/src/LineBrush'
import PointBrush from '@/asemic/src/DashBrush'
import { afterImage } from '@/util/src/tsl/afterImage'
import {
  float,
  fract,
  hash,
  If,
  mod,
  mx_noise_float,
  mx_noise_vec3,
  range,
  select,
  time,
  vec2,
  vec4
} from 'three/tsl'
import BlobBrush from '@/asemic/src/BlobBrush'

// Inspired by brutalism
export default function Genuary26() {
  return (
    <Asemic>
      {s => (
        <ParticlesBrush
          // renderInit
          onInit={b => {
            b.clear()
            b.transform({ reset: true, thickness: 200 })
            b.newCurve([0, 0.2], [0, 1], [0.7, s.h])
          }}
          attractorPush={0.9}
          speedDamping={1e-1}
          attractorPull={0}
          spacing={100}
          spacingType='count'
        />
      )}
    </Asemic>
  )
}
