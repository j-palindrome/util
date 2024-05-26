export const clock = (value: number, max: number, min: number = 0) => {
  if (value < min) value += max - min
  else if (value > max) value -= max - min
  return value
}

export const rad = (progress: number) => progress * Math.PI * 2

export const sine = (t: number, freq: number = 1, amp: number = 1) =>
  Math.sin(t * Math.PI * 2 * freq) * amp

export const scale = <T extends number | number[]>(
  input: T,
  low: number,
  high: number,
  lowOut: number,
  highOut: number,
  exp: number = 1,
  clamp = true
): T => {
  const scaleNumber = (input: number) => {
    if (high === low) return lowOut
    const zTo1 = ((input - low) / (high - low)) ** exp
    let final = zTo1 * (highOut - lowOut) + lowOut
    if (clamp && final > Math.max(lowOut, highOut)) return highOut
    if (clamp && final < Math.min(lowOut, highOut)) return lowOut
    return final
  }
  if (input instanceof Array) {
    return input.map((value) => scaleNumber(value)) as T
  } else {
    return scaleNumber(input) as T
  }
}

export const lerp = (start: number, end: number, progress: number) =>
  start + (end - start) * progress

export const mtof = (m: number) => {
  return 440 * 2 ** ((m - 69) / 12)
}
