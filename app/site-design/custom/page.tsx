'use client'

import _ from 'lodash'
import { useMemo } from 'react'
import { Num } from 'pts'
import { CanvasGL, Mesh, Reactive } from '@/util/reactive/components'
import { defaultVert2D } from '@/util/src/shaders/utilities'

export default function Portfolio() {
  const random = useMemo(() => {
    return _.range(200)
      .map(() => Num.randomPt([-1, -1], [1, 1]).toArray())
      .flat()
  }, [])
  const randomPoints = useMemo(
    () => _.range(200).map(x => Math.random() * Math.PI * 2),
    []
  )
  return (
    <Reactive className='h-topbar-screen w-screen relative'>
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
          draw={(self, gl, { time: { t } }) => self.draw({ t: t / 1000 })}
        />
      </CanvasGL>
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
    </Reactive>
  )
}
