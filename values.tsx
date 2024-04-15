import { RefObject, useEffect, useMemo, useRef, useState } from 'react'
import { scale } from './util'
import WebRenderer from '@elemaudio/web-renderer'
import _ from 'lodash'
import invariant from 'tiny-invariant'
import type p5 from 'p5'

// export function useAnimate<T extends Record<string, any>>(
//   setup: ({setup: (init: Partial<T>) => Partial<T>, dependencyKeys: string[]})[],
//   draw: (time: number, input: T) => Partial<T> | null,
//   cleanup: (input: T) => void,
//   animateDeps: any[] = [],
//   setupDeps: any[] = []
// ): RefObject<T | null> {
//   const props = useRef<T | null>(null)
//   const [animating, setAnimating] = useState(false)

//   let init: Partial<T> = {}
//   for (let initializePart of setup) {
//     const props = _.pick(init, initializePart.dependencyKeys)
//     const initPart = useMemo(() => initializePart.setup(props), initializePart.dependencyKeys.map(x => init[x]))
//     init = {...init, initPart}
//   }
//   let completeInit = init as T

//   const time = useRef(0)

//   useEffect(() => {
//     if (!animating) return
//     const animationFrame = requestAnimationFrame(delta => {
//       time.current += delta / 1000
//       const newProps = draw(time.current, props.current!)
//       if (newProps) {
//         for (let [key, value] of Object.entries(newProps)) {
//           props.current![key] = value
//         }
//       }
//     })
//     return () => {
//       cancelAnimationFrame(animationFrame)
//     }
//   }, [animating, ...animateDeps, ...setupDeps])

//   return props
// }

/**@param {number} signed: if signed, the function uses a separate max/min for negative and positive */
export const useNormalize = (
  init: number = 0,
  {
    signed = false,
    cancelAbove = false,
    cancelBelow = false,
  }: {
    signed?: boolean
    cancelAbove?: false | number
    cancelBelow?: false | number
  },
) => {
  const min = useRef(init)
  const max = useRef(init)
  const negMin = useRef(init < 0 ? Math.abs(init) : 0)
  const negMax = useRef(init < 0 ? Math.abs(init) : 0)

  return (newValue: number) => {
    if (signed && newValue < 0) {
      if (cancelAbove !== false && Math.abs(newValue) > cancelAbove)
        return negMax.current * -1
      if (cancelBelow !== false && Math.abs(newValue) < cancelBelow)
        return negMin.current * -1
      newValue = Math.abs(newValue)
      if (newValue < negMin.current) negMin.current = newValue
      if (newValue > negMax.current) negMax.current = newValue
      return scale(newValue, negMin.current, negMax.current, 0, -1)
    } else {
      if (cancelAbove !== false && newValue > cancelAbove) return max.current
      if (cancelBelow !== false && newValue < cancelBelow) return min.current
      if (newValue < min.current) min.current = newValue
      if (newValue > max.current) max.current = newValue
      return scale(newValue, min.current, max.current, 0, 1)
    }
  }
}
