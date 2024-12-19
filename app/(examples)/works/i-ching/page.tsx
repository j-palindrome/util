'use client'
import { useState } from 'react'
import Brush from './drawingSystem/Brush'
import Builder from './drawingSystem/Builder'
import { useInterval } from '@/util/src/dom'
import Asemic from './drawingSystem/Asemic'

const yin = (b: Builder) =>
  b
    .newCurve([0, 0], [0.4, 0])
    .newCurve([0.6, 0], [1, 0])
    .transform({ translate: [0, 1 / 6] })
const yang = (b: Builder) =>
  b.newCurve([0, 0], [1, 0]).transform({ translate: [0, 1 / 6] })
const hexagram = (b, map: ('yin' | 'yang')[]) => {
  b.newGroup()
  map.forEach(s => (s === 'yin' ? yin(b) : yang(b)))
  return b
}
const days: {
  asemic: [((b: Builder) => Builder)[], ((b: Builder) => Builder)[]]
  poem: [string, string, string, string, string, string]
}[] = [
  {
    poem: [
      'abundance alternates to brilliance injured',
      'one line giving way, thunder breaking way to earth',
      'go out to the field, sing one line of text, and singe the way into the darkness',
      'in praise of shadows: "As I have said there are certain prerequisites: a degree of dimness, absolute cleanliness, and quiet so complete one can hear the hum of a mosquito." (4)',
      'sngingign',
      'flkj'
    ],
    asemic: [
      [b => hexagram(b, ['yang', 'yin', 'yang', 'yang', 'yin', 'yin'])],
      [b => hexagram(b, ['yang', 'yin', 'yang', 'yin', 'yin', 'yin'])]
    ]
  },
  {
    poem: [
      'eliminating alternates to decrease',
      'one line giving way, thunder breaking way to earth',
      'go out to the field, sing one line of text, and singe the way into the darkness',
      'in praise of shadows: "As I have said there are certain prerequisites: a degree of dimness, absolute cleanliness, and quiet so complete one can hear the hum of a mosquito." (4)',
      'sngingign',
      'flkj'
    ],
    asemic: [
      [b => hexagram(b, ['yang', 'yang', 'yang', 'yang', 'yang', 'yin'])],
      [b => hexagram(b, ['yang', 'yang', 'yin', 'yin', 'yin', 'yang'])]
    ]
  },
  {
    poem: [
      'return alternates to union',
      'one line giving way, thunder breaking way to earth',
      'go out to the field, sing one line of text, and singe the way into the darkness',
      'in praise of shadows: "As I have said there are certain prerequisites: a degree of dimness, absolute cleanliness, and quiet so complete one can hear the hum of a mosquito." (4)',
      'sngingign',
      'flkj'
    ],
    asemic: [
      [b => hexagram(b, ['yang', 'yin', 'yin', 'yin', 'yin', 'yin'])],
      [b => hexagram(b, ['yin', 'yin', 'yin', 'yin', 'yang', 'yin'])]
    ]
  },
  {
    poem: [
      'contention alternates to before completion',
      'one line giving way, thunder breaking way to earth',
      'go out to the field, sing one line of text, and singe the way into the darkness',
      'in praise of shadows: "As I have said there are certain prerequisites: a degree of dimness, absolute cleanliness, and quiet so complete one can hear the hum of a mosquito." (4)',
      'sngingign',
      'flkj'
    ],
    asemic: [
      [b => hexagram(b, ['yin', 'yang', 'yin', 'yang', 'yang', 'yang'])],
      [b => hexagram(b, ['yin', 'yin', 'yin', 'yin', 'yang', 'yin'])]
    ]
  },
  {
    poem: [
      'childhood alternates to adorning',
      'one line giving way, thunder breaking way to earth',
      'go out to the field, sing one line of text, and singe the way into the darkness',
      'in praise of shadows: "As I have said there are certain prerequisites: a degree of dimness, absolute cleanliness, and quiet so complete one can hear the hum of a mosquito." (4)',
      'sngingign',
      'flkj'
    ],
    asemic: [
      [b => hexagram(b, ['yin', 'yang', 'yin', 'yin', 'yin', 'yang'])],
      [b => hexagram(b, ['yang', 'yin', 'yang', 'yin', 'yin', 'yang'])]
    ]
  },
  {
    poem: [
      'great exceeding alternates to advance',
      'one line giving way, thunder breaking way to earth',
      'go out to the field, sing one line of text, and singe the way into the darkness',
      'in praise of shadows: "As I have said there are certain prerequisites: a degree of dimness, absolute cleanliness, and quiet so complete one can hear the hum of a mosquito." (4)',
      'sngingign',
      'flkj'
    ],
    asemic: [
      [b => hexagram(b, ['yin', 'yang', 'yang', 'yang', 'yang', 'yin'])],
      [b => hexagram(b, ['yang', 'yang', 'yang', 'yin', 'yin', 'yin'])]
    ]
  }
]

export default function IChing() {
  const [day, setDay] = useState(0)

  const [timeSwitch, setTimeSwitch] = useState(0)
  useInterval(() => setTimeSwitch(timeSwitch => (timeSwitch ? 0 : 1)), 1000)
  console.log(timeSwitch)

  return (
    <div className='bg-black text-white font-mono h-screen w-screen overflow-auto flex flex-col'>
      <div className='flex justify-around p-2 *:border *:rounded-lg *:p-2 *:transition-colors *:duration-300'>
        <button className='hover:bg-white/30' onClick={() => setDay(0)}>
          Day 1
        </button>
        <button className='hover:bg-white/30' onClick={() => setDay(1)}>
          Day 2
        </button>
        <button className='hover:bg-white/30' onClick={() => setDay(2)}>
          Day 3
        </button>
        <button className='hover:bg-white/30' onClick={() => setDay(3)}>
          Day 4
        </button>
        <button className='hover:bg-white/30' onClick={() => setDay(4)}>
          Day 5
        </button>
        <button className='hover:bg-white/30' onClick={() => setDay(5)}>
          Day 6
        </button>
      </div>
      <div className='grow h-full py-4 relative'>
        {<Asemic builders={days[day].asemic[timeSwitch]}></Asemic>}
        {
          <div className='absolute top-0 left-0 w-full h-full flex flex-col justify-around px-4 font-serif text-sm italic'>
            {days[day].poem.map((x, i) => (
              <div key={i}>{x}</div>
            ))}
          </div>
        }
      </div>
    </div>
  )
}
