import { Children, cloneElement, useEffect, useRef, useState } from 'react'
import WebRenderer from '@elemaudio/web-renderer'
import type { FC, JSXElementConstructor, ReactNode } from 'react'
import invariant from 'tiny-invariant'
import _, { update } from 'lodash'

export const generateContexts = (
  el: HTMLCanvasElement,
  audioOptions: Parameters<WebRenderer['initialize']>[1]
): Promise<{
  ctx: AudioContext
  core: WebRenderer
  gl: WebGL2RenderingContext
  p5: any
}> => {
  const ctx = new AudioContext()
  const core = new WebRenderer()
  const gl = el.getContext('webgl2')!
  core.initialize(ctx, audioOptions).then(node => {
    node.connect(ctx.destination)
  })

  return new Promise(res => {
    core.on('load', async () => {
      const p5 = (await import('p5')).default
      res({
        ctx,
        core,
        gl,
        p5: p5 as any
      })
    })
  })
}

export const useAnimation = <Props>(
  initialize: boolean,
  init: () => Promise<Props>,
  draw: (
    clock: { time: number; timeDelta: number },
    props: Props
  ) => Partial<Props> | void,
  updates: {
    setup: (props: Props) => Partial<Props> | void
    deps?: any[]
    cleanup?: (props: Props) => void
  }[] = []
) => {
  const props = useRef<Props>({} as Props)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    init().then(newProps => {
      props.current = newProps
      setStarted(true)
    })
  }, [initialize])

  const updateProps = (newProps: Partial<Props> | void) => {
    if (newProps) {
      for (let key of Object.keys(newProps)) {
        props.current[key] = newProps[key]
      }
    }
  }

  for (let { setup, deps = [], cleanup } of updates) {
    useEffect(() => {
      if (!started) return
      const newProps = setup(props.current)
      updateProps(newProps)
      return () => {
        if (cleanup) cleanup(props.current)
      }
    }, [started, ...deps])
  }

  useEffect(() => {
    if (!started) return
    let time = 0
    let frameCounter: number
    const animationFrame = timeDelta => {
      time += timeDelta / 1000
      const newProps = draw({ time, timeDelta }, props.current)
      updateProps(newProps)
      frameCounter = requestAnimationFrame(animationFrame)
    }
    frameCounter = requestAnimationFrame(animationFrame)
    return () => {
      frameCounter && cancelAnimationFrame(frameCounter)
    }
  }, [started])

  return { props }
}
