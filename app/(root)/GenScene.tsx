import { Reactive, Call, Regl } from 'reactive-frames'
import {
  defaultFragColor,
  defaultVert2D,
  glslEs300
} from '@util/shaders/utilities'
import _ from 'lodash'
import { useRef } from 'react'

export default function GenScene() {
  const constants = {
    count: 10
  }

  const props = useRef({
    positions: [] as number[][][]
  })
  return (
    <Reactive
      loop={true}
      className='absolute top-0 left-0 h-screen w-screen -z-10'>
      <Regl
        name='regl'
        className='h-screen w-screen fixed top-0 left-0'
        draw={({ regl }) => {
          regl({
            attributes: {
              position: (c, p, id) => {
                return props.current.positions[id]
              }
            },
            uniforms: {
              resolution: (c, p, i) => [
                c.drawingBufferWidth,
                c.drawingBufferHeight
              ]
            },
            vert: glslEs300 + defaultVert2D,
            frag:
              glslEs300 +
              `out vec4 fragColor;\n` +
              defaultFragColor(1, 1, 1, 0.2),
            count: 3,
            blend: {
              enable: true,
              func: { src: 'src alpha', dst: 'one minus src alpha' }
            },
            depth: { enable: false }
          })(constants.count)
        }}></Regl>

      {_.range(10).map(i => (
        <Call
          key={i}
          name={`loopRandomizer-${i}`}
          setup={() => {
            props.current.positions[i] = _.range(3).map(() =>
              _.range(2).map(() => Math.random() * 2 - 1)
            )
          }}
          draw={() => {
            props.current.positions[i] = _.range(3).map(() =>
              _.range(2).map(() => Math.random() * 2 - 1)
            )
          }}
          deps={() => Math.random() ** 2 * 3000}
        />
      ))}
    </Reactive>
  )
}
