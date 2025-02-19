import { useEffect, useRef, useState } from 'react'

export const useLayer = <Props extends Record<string, any>>(
  setup: () => Promise<Props> | Props,
  draw: (time: number, props: Props) => Partial<Props> | undefined,
  cleanup: (props: Props) => void,
  deps: any[] = []
) => {
  const props = useRef<Props>(null as any)
  const [animating, setAnimating] = useState(false)

  const initialize = async () => {
    const initialProps = await setup()
    props.current = initialProps
    setAnimating(true)
  }

  useEffect(() => {
    initialize()
  }, [])

  useEffect(() => {
    if (!animating) return
    const frame: FrameRequestCallback = (time) => {
      const newProps = draw(time, props.current)
      if (newProps) {
        props.current = { ...props.current, ...newProps }
      }
    }
    const thisFrame = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(thisFrame)
      cleanup(props.current)
    }
  }, [animating, ...deps])

  return props
}

export const useAnimation = <Props extends Record<string, any>>(
  initialize: boolean,
  init: () => Promise<Props> | Props,
  draw: (time: number, props: Props) => Partial<Props> | void,
  updates: {
    setup: (props: Props) => Partial<Props> | void
    deps?: any[]
    cleanup?: (props: Props) => void
  }[] = [],
  cleanup: (props: Props) => void = () => {}
) => {
  const props = useRef<Props>({} as Props)
  const [started, setStarted] = useState(false)

  const start = async () => {
    const newProps = await init()
    props.current = newProps
    setStarted(true)
  }
  useEffect(() => {
    start()
    return () => {
      if (!started || !props.current) return
      cleanup(props.current)
    }
  }, [initialize])

  const updateProps = (newProps: Partial<Props> | void) => {
    if (newProps) {
      for (let key of Object.keys(newProps)) {
        // @ts-ignore
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
    let frameCounter: number
    const animationFrame: FrameRequestCallback = (time) => {
      const newProps = draw(time / 1000, props.current)
      updateProps(newProps)
      frameCounter = requestAnimationFrame(animationFrame)
    }
    frameCounter = requestAnimationFrame(animationFrame)
    return () => {
      frameCounter && cancelAnimationFrame(frameCounter)
    }
  }, [started])

  return props
}
