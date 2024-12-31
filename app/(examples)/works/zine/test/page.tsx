'use client'
import Asemic from '@/util/src/asemic/Asemic'
import Brush from '@/util/src/asemic/Brush'
import Builder from '@/util/src/asemic/Builder'
import { Vector2 } from 'three'

export default function Tests() {
  return (
    <Asemic
      className='bg-black'
      builder={b =>
        b
          .newGroup({
            rotate: 0.25,
            translate: [1, 0]
          })
          .repeat(
            () =>
              b.newCurve(
                [0, Math.random()],
                [0.25, Math.random()],
                [0.5, Math.random()],
                [0.75, Math.random()],
                [1, Math.random()]
              ),
            3
          )
      }
    />
  )
}
