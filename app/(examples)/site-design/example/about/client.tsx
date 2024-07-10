'use client'

import { generateRandomString } from '@/services/utility-functions'
import { range } from 'lodash'
import { useMemo, useState } from 'react'
import { Call, Hydra, Reactive } from 'reactive-frames'

export default function Client() {
  const randomStrings = useMemo(() => {
    return range(30).map((x, i) => generateRandomString(30))
  }, [])
  const [strings, setStrings] = useState(randomStrings)

  return (
    <>
      <Reactive>
        <Call
          name='stringRandoms'
          deps={100}
          draw={(self, { time }) => {
            console.log('setting strings')

            const newStrings: string[] = []
            const newIndex = Math.floor(
              ((time / 0.5) % 1) * (randomStrings.length - 1)
            )
            for (let i = 0; i < strings.length; i++) {
              const index = (newIndex + i) % (randomStrings.length - 1)

              // const index = i
              newStrings.push(randomStrings[index].slice(0))
            }
            setStrings(newStrings)
          }}
        />
      </Reactive>
      <svg viewBox='0 0 1 1' className='w-screen h-screen'>
        <g
          id='group'
          fontSize={0.05}
          fill='white'
          opacity={0.5}
          fontFamily='Courier New'>
          {randomStrings.map((x, i) => (
            <text suppressHydrationWarning key={i} x={0} y={0.05 * i + 0.025}>
              {strings[i]}
            </text>
          ))}
        </g>
        <text
          fontSize={0.05}
          fontFamily='Andale Mono'
          fill='white'
          x={0.5}
          y={0.5}
          textAnchor='middle'>
          tell your story
        </text>
      </svg>
    </>
  )
}
