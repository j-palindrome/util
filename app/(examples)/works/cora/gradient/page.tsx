'use client'
import { useAsemic } from '@/util/src/asemic/Asemic'
import Background from '@/util/src/asemic/Background'
import DotBrush from '@/util/src/asemic/DotBrush'
import { gaussian } from '@/util/src/tsl/gaussian'
import { noiseWaveRandom } from '@/util/src/tsl/noise'
// line that may or may not intersect

import { extend } from '@react-three/fiber'
import _ from 'lodash'

import { Fn } from 'three/src/nodes/TSL.js'
import {
  float,
  int,
  Loop,
  range,
  sin,
  time,
  uniformArray,
  uv,
  vec4
} from 'three/tsl'
import { MeshBasicNodeMaterial, QuadMesh, Vector2 } from 'three/webgpu'

extend({ QuadMesh, MeshBasicNodeMaterial })
// grid-based graphic design
export default function Genuary29() {
  const { h, size, mouse } = useAsemic()
  const count = 10
  const positions = uniformArray(
    _.range(count).map(() => new Vector2().random()),
    'vec2'
  )
  const noises = uniformArray(
    _.range(count).map(() => Math.random()),
    'float'
  )
  return (
    <DotBrush
      curveColor={input => {
        return vec4(
          input.xyz,
          sin(range(1, 3).mul(time)).add(1).div(2).mul(input.a)
        )
      }}
      onInit={b =>
        b
          .transform({ scale: [1, h] })
          .transform({
            alpha: 1 / count,
            strength: 1,
            push: true
          })
          .newCurve()
          .repeatGrid([3, 3 * h], ({ pComplete, count }) => {
            b.newPoints([
              pComplete.x,
              pComplete.y,
              {
                thickness: size.x * 2,
                reset: 'last',
                translate: b.getRandomWithin([-0.1, -0.1], [0.1, 0.1])
              }
            ])
          })
      }
    />
  )
}
