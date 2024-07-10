'use client'
import { Group } from 'pts'
import { useMemo } from 'react'
import { Hydra, Reactive } from 'reactive-frames'

export default function Client() {
  const d = useMemo(() => {
    let path = ['M 0.5 0.5']
    for (let i = 0; i < 10; i++) {
      const BOUNCE = 0.4
      const group = Group.fromArray([
        [0.5, 0.5],
        [1 + 0.2 + (i / 10) * 0.8, 0.5],
        [1 * (1 - (i / 10) * BOUNCE), 1 * (1 - (i / 10) * BOUNCE)]
      ])
      group.scale(i / 10)
      group.rotate2D(((i % 4) / 4) * Math.PI * 2)
      path.push(
        `Q ${group
          .slice(1)
          .flatMap(x => x.map(x => x.toFixed(2) as any).join(' ') as any)
          .join(' ')}`
      )
    }

    return path.join(' ')
  }, [])

  return (
    <svg viewBox={'0 0 1 1'} className={'h-screen w-screen'}>
      <text
        x='0.5'
        y='0.5'
        textAnchor='middle'
        fill='white'
        fontFamily='Andale Mono'
        fontSize={0.05}>
        get hired
      </text>
      <circle stroke='white' fill='transparent' strokeWidth={0.01}>
        <animate
          attributeName='r'
          values='0;0.18;0'
          dur='5s'
          repeatCount='indefinite'
        />
        <animateMotion
          path={d}
          dur='5s'
          repeatCount='indefinite'
          keyPoints='1; 0; 1'
          keyTimes='0; 0.5; 1'
          calcMode='spline'
          keySplines='0.5 1 0.5 1; 0.5 0 1 0.5'
        />
      </circle>
      <g transform='rotate(75 0.5 0.5)'>
        <circle stroke='white' fill='transparent' strokeWidth={0.01}>
          <animate
            attributeName='r'
            values='0;0.18;0'
            dur='5s'
            repeatCount='indefinite'
            begin='3s'
          />
          <animateMotion
            path={d}
            dur='5s'
            repeatCount='indefinite'
            keyPoints='1; 0; 1'
            keyTimes='0; 0.5; 1'
            calcMode='spline'
            keySplines='0.5 1 0.5 1; 0.5 0 1 0.5'
            begin='3s'
          />
        </circle>
      </g>
    </svg>
  )
}
