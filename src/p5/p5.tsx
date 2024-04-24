import type p5 from 'p5'
import { Suspense, lazy, useRef } from 'react'

const LazyP5 = lazy(async () => {
  if (typeof window === 'undefined') throw new Error('Client-only P5')
  return await import('./p5.client')
})

export type Init = (p: p5) => void
export type P5Arguments = {
  init: Init
  className?: string
  props?: React.Ref<Record<string, any>>
}
export default function P5({ init, className }: P5Arguments) {
  return (
    <>
      <Suspense fallback={<></>}>
        <LazyP5 {...{ init, className }} />
      </Suspense>
    </>
  )
}
