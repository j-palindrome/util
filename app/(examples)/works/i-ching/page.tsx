'use client'
import GroupBuilder from '@/util/src/asemic/Builder'
import { useInterval } from '@/util/src/dom'
import { useState } from 'react'
import Asemic from '@/util/src/asemic/Asemic'
import PointBrush from '@/util/src/asemic/DashBrush'

const yin = (b: GroupBuilder) =>
  b
    .newCurve([0, 0], [0.4, 0])
    .newCurve([0.6, 0], [1, 0])
    .transform({ translate: [0, 1 / 6] })
const yang = (b: GroupBuilder) =>
  b.newCurve([0, 0], [1, 0]).transform({ translate: [0, 1 / 6] })
const hexagram = (b, map: ('yin' | 'yang')[]) => {
  b.newGroup()
  map.forEach(s => (s === 'yin' ? yin(b) : yang(b)))
  return b
}
const days: {
  asemic: [
    ((b: GroupBuilder) => GroupBuilder)[],
    ((b: GroupBuilder) => GroupBuilder)[]
  ]
  poem: [string, string, string, string, string, string]
}[] = [
  {
    poem: [
      'abundance alternates to brilliance injured',
      'one line giving way, thunder breaking way to earth',
      'go outside, sing one line of text, and singe the way into the darkness',
      'in praise of shadows: "As I have said there are certain prerequisites: a degree of dimness, absolute cleanliness, and quiet so complete one can hear the hum of a mosquito." (4)',
      'i treated it as a rhythm: going throughout the day, humming in my head',
      'the song was best heard against reflections, in transit, when something was in the way'
    ],
    asemic: [
      [b => hexagram(b, ['yang', 'yin', 'yang', 'yang', 'yin', 'yin'])],
      [b => hexagram(b, ['yang', 'yin', 'yang', 'yin', 'yin', 'yin'])]
    ]
  },
  {
    poem: [
      'eliminating alternates to decrease',
      'soldiers push out the darkness, then the society falls through its middle',
      'go through your day watching overflows.',
      'andy warhol: "As soon as I became a loner in my own mind, that\'s when I got what you might call a "following"',
      'i make a point to talk too much, just a bit, in social interactions',
      'the final words are always affirmations'
    ],
    asemic: [
      [b => hexagram(b, ['yang', 'yang', 'yang', 'yang', 'yang', 'yin'])],
      [b => hexagram(b, ['yang', 'yang', 'yin', 'yin', 'yin', 'yang'])]
    ]
  },
  {
    poem: [
      'return alternates to union',
      'the final month, the solid line moves upwards breaking through the ground',
      'plant a small seed',
      'At Work With Grotowski: "You must turn back, toward the seed of the first  proposition and find that which, from the point of view of this primary motivation, requires a new restructuring of the whole" (45).',
      'i set an alarm for early the next morning, intending to move at the waking of the day',
      'the fog is heavy in my head, but there is some optimism'
    ],
    asemic: [
      [b => hexagram(b, ['yang', 'yin', 'yin', 'yin', 'yin', 'yin'])],
      [b => hexagram(b, ['yin', 'yin', 'yin', 'yin', 'yang', 'yin'])]
    ]
  },
  {
    poem: [
      'contention alternates to not yet fulfilled',
      'an imbalanced breakage moves to balanced energies',
      'do not seek to resolve the tension',
      'Hui: "in Europe, philosophy\'s attempt to separate itself from mythology is precisely conditioned by mythology, meaning that mythology reveals the germinal form of such a mode of philosophising" (10-11)',
      'i choose to not write computer code, instead describing it in language',
      'the words lack clarity, but can get more thinking done'
    ],
    asemic: [
      [b => hexagram(b, ['yin', 'yin', 'yin', 'yin', 'yang', 'yin'])],
      [b => hexagram(b, ['yin', 'yang', 'yin', 'yang', 'yin', 'yang'])]
    ]
  },
  {
    poem: [
      'childhood alternates to adorning',
      'a spring flows out of a mountain, the child tending towards adolescence',
      'water this mirror, gather up your courage',
      '"There are both a very large quantity and a very large variety of types of information and research data feeding into and decanting from the project" (Performance as Research)',
      'i sing into the reading of words, repeating them different ways',
      'they become sounds, and the sounds become ideas'
    ],
    asemic: [
      [b => hexagram(b, ['yin', 'yang', 'yin', 'yin', 'yin', 'yang'])],
      [b => hexagram(b, ['yang', 'yin', 'yang', 'yin', 'yin', 'yang'])]
    ]
  },
  {
    poem: [
      'great exceeding alternates to advance',
      'the supportive solid is framed by yielding, then merge to flow forwards',
      'establish a foundation, then leap',
      'language and myth: "word and mythic image, which once confronted the human mind as hard realistic powers, have now cast off all reality and effectuality; they have become a light, bright ether in which the spirit can move without let or hindrance"',
      "i don't write, but instead go up to the seventh floor and open the window",
      'feeling the full air of the city, the space between myself and the ground'
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
        {
          <Asemic>
            {days[day].asemic[timeSwitch].map((x, i) => (
              <PointBrush key={i} render={x} />
            ))}
          </Asemic>
        }
        {
          <div className='absolute top-0 left-0 w-full h-full flex flex-col justify-around px-4 font-serif text-sm italic text-center'>
            {days[day].poem.map((x, i) => (
              <div key={i}>{x}</div>
            ))}
          </div>
        }
      </div>
    </div>
  )
}
