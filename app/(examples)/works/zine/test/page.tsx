'use client'
import Asemic from '@/util/src/asemic/Asemic'
import Brush from '@/util/src/asemic/Brush'

export default function Tests() {
  return (
    <Asemic className='bg-black'>
      <Brush
        builder={b =>
          // b
          //   .newGroup({
          //     reset: 'last',
          //     scale: 0.7,
          //     translate: [0.15, 0.15]
          //   })
          //   .newCurve()
          //   .repeat(
          //     b => b.newPoints(b.getRandomWithin([0.5, 0.5], [0.5, 0.5])),
          //     30
          //   )
          //   .set({ strength: 1 })
          b
            .repeat(() => {
              b.newGroup().newCurve(
                ...b.getRandomWithin([0.5, 0.5], [0.5, 0.5], 3)
              )
            }, 1000)
            .set({ alpha: 0.05 })
        }
      />
    </Asemic>
  )
}
