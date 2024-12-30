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
          // b
          //   .repeat(() => {
          //     b.newGroup().newCurve(
          //       ...b.getRandomWithin([0.5, 0.5], [0.5, 0.5], 3)
          //     )
          //   }, 1000)
          //   .set({ alpha: 0.05 })
          b
            .set({
              rotate: 0.25,
              translate: [1, 0]
            })
            .repeat(
              () =>
                b
                  .newGroup()
                  .newCurve(
                    [0, Math.random()],
                    [0.25, Math.random()],
                    [0.5, Math.random()],
                    [0.75, Math.random()],
                    [1, Math.random()]
                  ),
              3
            )
        }
      />
    </Asemic>
  )
}
