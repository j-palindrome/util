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

// Inspired by brutalism
export default function Genuary26() {
  return (
    <Asemic>
      {s => (
        <StripeBrush
          renderInit
          onInit={b => {
            b.clear()
            b.newCurve(
              [0, 0, { translate: [0, s.h / 2], scale: [1, s.h / 2] }],
              [0.33, b.getWaveNoise(3, { signed: true, harmonics: 1 })],
              [0.66, b.getWaveNoise(3, { signed: true, harmonics: 1 })],
              [1, 0]
            ).newCurve(
              [0, 0],
              [0.33, b.getWaveNoise(3, { signed: true, harmonics: 1 })],
              [0.66, b.getWaveNoise(3, { signed: true, harmonics: 1 })],
              [1, 0]
            )
          }}
        />
      )}
    </Asemic>
  )
}
