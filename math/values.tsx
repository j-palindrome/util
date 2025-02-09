import { useRef } from 'react'
import { scale } from './math'

/**@param {number} signed: if signed, the function uses a separate max/min for negative and positive */
export const useNormalize = (
  init: number = 0,
  {
    signed = false,
    cancelAbove = false,
    cancelBelow = false
  }: {
    signed?: boolean
    cancelAbove?: false | number
    cancelBelow?: false | number
  }
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
