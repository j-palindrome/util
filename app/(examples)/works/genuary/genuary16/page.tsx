'use client'
import Asemic, { AsemicCanvas } from '@/util/src/asemic/Asemic'
import { scale } from '@/util/src/math'
import { now } from 'lodash'

import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js'
import { floor, Fn, PI2, range, select, vec4 } from 'three/tsl'

export default function Genuary16() {
  return (
    <AsemicCanvas dimensions={[1080, 1920]}>
      <Asemic builder={b => b.newGroup('dash')} />
    </AsemicCanvas>
  )
}
