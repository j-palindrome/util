'use client'

import { range } from 'lodash'
import { useRef } from 'react'
import { Reactive, Hydra, Call } from 'reactive-frames'

export default function Client() {
  const rectangles = useRef<SVGGElement>(null!)
  return (
    <>
      <div className='h-screen w-screen relative'>
        <Reactive className='h-full w-full absolute top-0 left-0'>
          <Call
            name='svg'
            draw={(s, { time }) => {
              const rects = rectangles.current.children
              let i = 0
              for (let rect of rects) {
                rect.setAttribute(
                  'opacity',
                  `${((Math.sin((time + i / rects.length) * Math.PI * 2) + 1) / 2 + 0.3) * 0.7}`
                )
                i++
              }
            }}
          />
        </Reactive>
        <svg className='h-full w-full absolute top-0 left-0' viewBox='0 0 1 1'>
          <g fill='white' fontFamily='Andale Mono'>
            <text x={0.5} y={0.05} textAnchor='middle' fontSize={0.05}>
              Show your work
            </text>
          </g>
          <g fill='white' ref={rectangles}>
            {range(12).map(i => (
              <rect
                key={i}
                height={0.2}
                width={0.2}
                x={(i % 4) * 0.25}
                y={Math.floor(i / 4) * 0.25 + 0.2}
              />
            ))}
          </g>
        </svg>
      </div>
    </>
  )
}
