'use client'
import Asemic from '@/util/src/asemic/Asemic'
import { Vector3 } from 'three'
import { range, vec4 } from 'three/tsl'

export default function Tests() {
  return (
    <Asemic
      className='bg-black'
      builder={b =>
        b
          .newGroup({
            curveVert: (input, { tPoint }) =>
              input.add(vec4(tPoint, range(0, 1), 0, 0)),
            curveFrag: input =>
              vec4(range(new Vector3(0, 0, 0), new Vector3(1, 1, 1)), 1)
          })
          .repeat(
            () => b.newCurve([0, 0], [0.1, 0], [0.2, 0], [0.3, 0], [0.4, 0]),
            3
          )
      }
    />
  )
}
