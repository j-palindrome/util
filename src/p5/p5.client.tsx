import p5 from 'p5'
import { useEffect, useRef } from 'react'
import { Init, P5Arguments } from './p5'

export default function P5({ init, className }: P5Arguments) {
  const frame = useRef<HTMLCanvasElement>(null!)
  useEffect(() => {
    const p = new p5((p: p5) => {
      init(p)
    })

    // return () => {
    //   p.remove()
    // }
  })

  return <></>
}
