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
