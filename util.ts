import { useEffect, useMemo, useRef, useState } from 'react'

export const useSlider = (
  frame: React.RefObject<HTMLDivElement>,
  onMouseMove: ({ x, y }: { x: number; y: number }) => void,
  onMouseUp?: ({ x, y }: { x: number; y: number }) => void,
) => {
  const [dragging, setDragging] = useState(false)

  const getXY = (ev: MouseEvent) => {
    const rect = frame.current!.getBoundingClientRect()
    const x = (ev.clientX - rect.left) / rect.width
    const y = 1 - (ev.clientY - rect.top) / rect.height
    return { x, y }
  }

  const open = useRef(false)

  useElementEventListener(frame, 'mousedown', () => setDragging(true))

  useEffect(() => {
    open.current = dragging
  }, [dragging])

  useElementEventListener(
    frame,
    'mousemove',
    (ev) => {
      if (!dragging || !open.current) return
      onMouseMove(getXY(ev))
      open.current = false
      requestAnimationFrame(() => (open.current = true))
    },
    [dragging],
  )

  useElementEventListener(frame, 'mouseleave', (ev) => {
    setDragging(false)
    if (onMouseUp) onMouseUp(getXY(ev))
  })

  useElementEventListener(frame, 'mouseup', (ev) => {
    setDragging(false)
    if (onMouseUp) onMouseUp(getXY(ev))
  })
}

export const useRefAsState = <T>(
  initialValue: T | null,
): [T, (set: T) => void, () => T] => {
  const ref = useRef<T | null>(initialValue)
  const setRef = (newValue: T) => {
    ref.current = newValue
  }
  const getRef = () => ref.current!
  return [ref.current!, setRef, getRef]
}

export type Pixel = { pixel: Uint8Array; x: number; y: number }
const PIXEL = 4
export class PixelArray extends Uint8Array {
  width: number
  height: number
  diagonal: number

  distance([x1, y1]: [number, number], [x2, y2]: [number, number]) {
    return ((x1 - x2) ** 2 + (y1 - y2) ** 2) ** 0.5 / this.diagonal
  }

  forEachPixel(
    callback: (values: Uint8Array, x: number, y: number) => void,
    { downsampling = 1 }: { downsampling?: number },
  ) {
    for (let y = 0; y < this.height; y += downsampling) {
      for (let x = 0; x < this.width; x += downsampling) {
        callback(this.getPixelAt(x, y), x, y)
      }
    }
  }

  downsample(downsampling: number) {
    const numbers: Uint8Array[] = []
    for (let y = 0; y < this.height; y += downsampling) {
      for (let x = 0; x < this.width; x += downsampling) {
        numbers.push(
          this.average(this.getPixelsAt(x, y, downsampling, downsampling)),
        )
      }
    }
    return numbers
  }

  findPixel(
    callback: (values: Uint8Array, x: number, y: number) => boolean,
    {
      angle = 0,
      start = [0, 0],
      downsample = 1,
    }: {
      angle?: number
      start?: [number, number]
      wrap?: boolean
      downsample?: number
    },
  ): Pixel | undefined {
    const traverseX = Math.sin(angle)
    const traverseY = Math.cos(angle)
    let x = start[0]
    let y = start[1]
    while (x < this.width && y < this.height) {
      x += traverseX * downsample
      y += traverseY * downsample
      const pixel = this.getPixelAt(x, y)
      if (callback(pixel, x, y)) return { pixel, x, y }
    }
  }

  getPixelAt(x: number, y: number) {
    const start = this.xyToIndex(x, y)
    return this.subarray(start, start + PIXEL)
  }

  xyToIndex(x: number, y: number) {
    return Math.floor(y * PIXEL * this.width + x * PIXEL)
  }

  indexToXy(i: number) {
    return [i % this.width, Math.floor(i / this.width)] as [number, number]
  }

  getPixelsAt(x: number, y: number, width: number, height: number) {
    const numbers: Uint8Array[] = []
    for (let sampleY = y; sampleY < y + height; y++) {
      numbers.push(
        this.subarray(
          this.xyToIndex(x, sampleY),
          this.xyToIndex(x + width, sampleY),
        ),
      )
    }
    return numbers
  }

  // you give it rows for it to average...for efficiency
  average(pixels?: Uint8Array[], { downsampling = 1 } = {}) {
    if (!pixels) pixels = [this]
    let r = 0,
      g = 0,
      b = 0,
      a = 0
    let len = 0
    for (let y = 0; y < pixels.length; y += downsampling) {
      const pixelArray = pixels[y]
      for (let i = 0; i < pixelArray.length; i += 4 * downsampling) {
        r += pixelArray[i]
        g += pixelArray[i + 1]
        b += pixelArray[i + 2]
        a += pixelArray[i + 3]
        len++
      }
    }

    return new Uint8Array([
      (r / len) * 255,
      (g / len) * 255,
      (b / len) * 255,
      (a / len) * 255,
    ])
  }

  constructor(initArray: number[] | Uint8Array, width: number, height: number) {
    super(initArray)
    this.width = width * PIXEL
    this.height = height * PIXEL
    this.diagonal = (width ** 2 + height ** 2) ** (1 / 2)
  }
}

export const probLog = (prob: number, ...args: any[]) => {
  if (Math.random() < prob) {
    console.log(...args)
  }
}

export const useEventListener = <K extends keyof WindowEventMap>(
  listener: K,
  func: (data: WindowEventMap[K]) => void,
  dependencies: any[] = [],
) => {
  useEffect(() => {
    window.addEventListener(listener, func)
    return () => window.removeEventListener(listener, func)
  }, dependencies)
}

export const useElementEventListener = <K extends keyof HTMLElementEventMap>(
  element: React.RefObject<HTMLElement>,
  listener: K,
  func: (data: HTMLElementEventMap[K]) => void,
  dependencies: any[] = [],
) => {
  useEffect(() => {
    if (!element.current) return
    element.current.addEventListener(listener, func)
    return () => element.current?.removeEventListener(listener, func)
  }, dependencies)
}

export const useInterval = (
  interval: () => void,
  intervalTime: number,
  dependencies: any[] = [],
) => {
  useEffect(() => {
    const intervalIndex = window.setInterval(interval, intervalTime)
    return () => window.clearInterval(intervalIndex)
  }, dependencies)
}

export const rad = (progress: number) => progress * Math.PI * 2

export const scale = <T extends number | number[]>(
  input: T,
  low: number,
  high: number,
  lowOut: number,
  highOut: number,
  exp: number = 1,
  clamp = true,
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

export const create = <T>(e: T, onCreate: (argument: T) => void) => {
  onCreate(e)
  return e
}

export const useMemoCleanup = <T>(
  create: () => T,
  cleanup: (item: T) => void,
  deps: any[] = [],
) => {
  const itemRef = useRef<T | null>(null)
  const item = useMemo(() => {
    if (itemRef.current) {
      cleanup(itemRef.current)
      itemRef.current = null
    }
    return create()
  }, deps)
  itemRef.current = item
  return item
}

export const lerp = (start: number, end: number, progress: number) =>
  start + (end - start) * progress

export const mtof = (m: number) => {
  return 440 * 2 ** ((m - 69) / 12)
}
