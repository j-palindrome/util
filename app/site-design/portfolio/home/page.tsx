'use client'
import { Reactive } from 'reactive-frames'
import Call from 'reactive-frames'

export default function Home() {
  return (
    <Reactive className='h-screen-topbar w-screen'>
      <Call
        name='svg'
        draw={(s, { time: { t } }) => {
          const id = document.getElementById('rect')
          const points = [
            [0.2, 0.2],
            [0.2, 1],
            [1, 1],
            [1, 0.2]
          ]
          const newRandomPoints = points.map(x => [
            x[0] + Math.random() * 0.02 - 0.1,
            x[1] + Math.random() * 0.02 - 0.1
          ])
          id?.setAttribute(
            'd',
            newRandomPoints
              .map(
                (x, i) =>
                  `${i === 0 ? 'M' : 'L'} ${x[0].toFixed(2)} ${x[1].toFixed(2)}`
              )
              .join(' ') + 'Z'
          )
        }}
      />
      <Call
        name='svg2'
        draw={(s, { time: { t } }) => {
          const id = document.getElementById('rect2')
          const points = [
            [0.1, 0.1],
            [0.1, 0.9],
            [0.9, 0.9],
            [0.9, 0.1]
          ]
          const newRandomPoints = points.map(x => [
            x[0] + Math.random() * 0.02 - 0.1,
            x[1] + Math.random() * 0.02 - 0.1
          ])
          id?.setAttribute(
            'd',
            newRandomPoints
              .map(
                (x, i) =>
                  `${i === 0 ? 'M' : 'L'} ${x[0].toFixed(2)} ${x[1].toFixed(2)}`
              )
              .join(' ') + 'Z'
          )
        }}
      />
      <svg viewBox='0 0 1 1' className='w-full h-full'>
        <path
          id='rect'
          d='M 0.2 0.2 L 0.2 0.8 L 0.8 0.8 L 0.8 0.2 L 0.2 0.2'
          strokeWidth={0.01}
          fill='transparent'
          stroke='white'></path>
        <path
          id='rect2'
          d='M 0.2 0.2 L 0.2 0.8 L 0.8 0.8 L 0.8 0.2 L 0.2 0.2'
          strokeWidth={0.01}
          stroke='white'
          fill='transparent'
          opacity={0.5}></path>
        <text
          fill='white'
          fontFamily='Andale Mono'
          textAnchor='middle'
          x={0.5}
          y={0.5}
          fontSize={0.05}>
          Make a statement
        </text>
      </svg>
    </Reactive>
  )
}
