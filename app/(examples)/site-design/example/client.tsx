'use client'

import { range } from 'lodash'
import { Num } from 'pts'
import { useMemo } from 'react'
import { CanvasGL, Mesh, Reactive } from 'reactive-frames'
import { ReactiveContext } from 'reactive-frames/dist/types'

export default function Client() {
  type Context = ReactiveContext<
    {},
    {
      mouseX: number
      mouseY: number
      textStrings: string[]
    }
  >

  const random = useMemo(() => {
    return range(200)
      .map(() => Num.randomPt([-1, -1], [1, 1]).toArray())
      .flat()
  }, [])
  const randomPoints = useMemo(
    () => range(200).map(x => Math.random() * Math.PI * 2),
    []
  )

  return (
    <div className='h-screen w-screen fixed top-0 left-0'>
      <Reactive className='h-full w-full absolute top-0 left-0'>
        <CanvasGL name='canvas' className='h-full w-full'>
          <Mesh
            name='points'
            drawMode='points'
            attributes={{
              position: { data: random, numComponents: 2 },
              random: { data: randomPoints, numComponents: 1 }
            }}
            vertexShader={
              /*glsl*/ `
            in vec2 position;
            in float random;
            out float v_random;
            void main() {
              v_random = random;
              gl_Position = vec4(position, 0.0, 1.0);
              gl_PointSize = 10.0;
            }`
            }
            fragmentShader={
              /*glsl*/ `
            #define PI 3.1415927
            in float v_random;
            uniform float t;
            void main() {
              // vec2 uv = (v_position + 1.0) / 2.0 / 2.0;
              fragColor = vec4(1.0, 1.0, 1.0, sin((v_random + t) * PI * 2.0));
            }`
            }
            draw={(self, gl, { time }) => self.draw({ t: time })}
          />
        </CanvasGL>
      </Reactive>
      <svg className='w-full h-full absolute top-0 left-0' viewBox='0 0 1 1'>
        <text
          fill='white'
          fontSize={0.05}
          fontFamily='Andale Mono'
          textAnchor='middle'
          x={0.5}
          y={0.5}>
          What will you create?
        </text>
      </svg>
    </div>
  )
}
