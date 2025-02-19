import { useEffect, useRef, useState } from 'react'

/**
 * onChange returns style which is applied to the slider
 */
export default function Slider({
  children,
  className,
  innerClassName,
  onChange,
  onEnd,
  values
}: React.PropsWithChildren & {
  className?: string
  innerClassName?: string
  onChange: ({ x, y }: { x: number; y: number }, slider: HTMLDivElement) => void
  onEnd: ({ x, y }: { x: number; y: number }) => void
  values: { x: number; y: number }
}) {
  //
  const [clicking, setClicking] = useState(false)
  const rect = useRef<DOMRect | null>(null)
  const slider = useRef<HTMLDivElement>(null)
  const place = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  const end = () => {
    if (!clicking) return
    setClicking(false)
    onEnd(place.current)
  }

  useEffect(() => {
    if (!slider.current) return
    onChange(values, slider.current)
  }, [values])

  const updateMouse = (ev: React.MouseEvent) => {
    if (clicking && rect.current) {
      const x = (ev.clientX - rect.current.x) / rect.current.width
      const y = 1 - (ev.clientY - rect.current.y) / rect.current.height
      onChange({ x, y }, slider.current!)
      place.current = { x, y }
    }
  }

  return (
    <div
      className={`${className} relative h-full flex overflow-hidden`}
      onMouseDown={ev => setClicking(true)}
      onMouseUp={ev => {
        updateMouse(ev)
        end()
      }}
      onMouseLeave={ev => {
        updateMouse(ev)
        end()
      }}
      onMouseMove={ev => {
        updateMouse(ev)
      }}
      ref={node => {
        if (!node) return
        const gotRect = node.getBoundingClientRect()
        rect.current = gotRect
      }}>
      <div
        className={`${innerClassName} absolute bottom-0 left-0`}
        ref={slider}></div>
      <div
        className='h-full w-4'
        onClick={() => setTimeout(() => onEnd({ x: 0, y: 0 }))}></div>
      <div className='h-full w-full flex justify-center items-center select-none mix-blend-difference'>
        {children}
      </div>
      <div
        className='h-full w-4'
        onClick={() => setTimeout(() => onEnd({ x: 1, y: 1 }))}></div>
    </div>
  )
}
