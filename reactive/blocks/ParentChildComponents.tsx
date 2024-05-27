'use client'

import { Children, createContext, useEffect, useRef, useState } from 'react'
import invariant from 'tiny-invariant'
import { useInvariantContext } from '../../src/react'
import { omit } from 'lodash'

function useCreateComponent<Self>(
  name: string,
  getSelf: () => Self | Promise<Self>,
  options: Record<string, any>,
  setupSelf?: (self: Self, context: ReactiveContext) => void,
  drawSelf?: (self: Self, context: ReactiveContext) => void,
  drawSelfDeps?: DepsOptions,
  cleanupSelf?: (self: Self) => void
) {
  const { allCreated, registerComponent, elements, props } = useInvariantContext(
    TopLevelContext,
    'Need to nest under <Reactive> component'
  )

  const [self, setSelf] = useState<Self | null>(null)
  const creating = useRef(false)

  const asyncCreate = async () => {
    const self = await getSelf()
    setSelf(self)
    creating.current = false
  }

  const recreateDeps = Object.values(omit(options, 'name', 'setup', 'draw', 'children', 'deps'))
    .map((x) => x.toString())
    .join(';')

  useEffect(() => {
    if (!self) return

    registerComponent(name, {
      self,
      draw: drawSelf ? (context) => drawSelf(self, context) : null,
      update: drawSelfDeps ? false : 'always'
    })
    return () => {
      registerComponent(name, null)
      if (cleanupSelf) {
        cleanupSelf(self)
      }
    }
  }, [self])

  useEffect(() => {
    if (creating.current) return
    creating.current = true
    asyncCreate()
    return
  }, [recreateDeps])

  useEffect(
    () => {
      if (!self || !drawSelfDeps) return
      const requestFrame = () => registerComponent(name, { update: true })
      if (typeof drawSelfDeps === 'number') {
        const interval = window.setInterval(requestFrame, drawSelfDeps)
        return () => window.clearInterval(interval)
      } else if (typeof drawSelfDeps === 'function') {
        let timeout: number
        const repeatFrameRequest = () => {
          requestFrame()
          timeout = window.setTimeout(repeatFrameRequest, drawSelfDeps())
        }
        timeout = window.setTimeout(repeatFrameRequest, drawSelfDeps())
        return () => window.clearTimeout(timeout)
      } else {
        requestFrame()
      }
    },
    drawSelfDeps instanceof Array ? drawSelfDeps : [self]
  )

  useEffect(() => {
    if (!self) return
    registerComponent(name, {
      draw: drawSelf ? (context) => drawSelf(self, context) : null
    })
  }, [drawSelf])

  useEffect(() => {
    if (!self || !setupSelf || !allCreated) return
    setupSelf(self, { elements, props, t: 0, dt: 0 })
    return () => {
      cleanupSelf && cleanupSelf(self)
    }
  }, [allCreated])
  return { self }
}

const TopLevelContext = createContext<{
  registerComponent: (name: string, component: Partial<ComponentType> | null) => void
  elements: Record<string, any>
  props: Record<string, any>
  allCreated: boolean
} | null>(null)
const FrameContext = createContext<{
  frame: any
} | null>(null)

function TopLevelComponent({
  children,
  loop = true,
  className,
  style
}: {
  children?: AllowedChildren
  loop?: boolean | number
  className?: string
  style?: React.CSSProperties
}) {
  // the order to call draw calls in, using the key/string pairings from above
  let childrenDraws = useRef<string[]>([])
  // We have to save setups so that we know what hasn't been created yet. Every time a component calls registerComponent (on creation) this list is updated. Once the draw
  let childrenSetups = useRef<string[]>([])

  useEffect(() => {
    let drawCalls: any[] = []
    let setupCalls: any[] = []
    const childMap = (child: JSX.Element | JSX.Element[] | undefined) => {
      if (!child) return
      if (child instanceof Array) {
        child.forEach((child) => childMap(child))
        return
      }
      if (child.props.name) {
        setupCalls.push(child.props.name)
        if (child.props.draw) drawCalls.push(child.props.name)
        Children.forEach(child.props.children, (child) => childMap(child))
      }
    }
    Children.forEach(children, (child) => childMap(child))
    childrenDraws.current = drawCalls
    childrenSetups.current = setupCalls
  })

  const [allCreated, setAllCreated] = useState(false)

  const components = useRef<Record<string, ComponentType>>({})
  // when allCreated is true elements get passed down as is (just to pass selves through)
  const elements = useRef<Record<string, any>>({})
  const props = useRef<Record<string, any>>({})
  const registerComponent = (name: string, component: Partial<ComponentType> | null) => {
    if (component) {
      components.current[name] = { ...components.current[name], ...component }
      if (component.self) elements.current[name] = component.self
    } else {
      delete components.current[name]
      delete elements.current[name]
    }

    let allCreated = true
    for (let key of childrenSetups.current) {
      if (!components.current[key]) {
        allCreated = false
        break
      }
    }

    setAllCreated(allCreated)
  }

  const time = useRef(0)

  useEffect(() => {
    if (!allCreated) return

    let animationFrame: number
    let interval: number
    const drawFrame = (t: number, dt: number) => {
      const topContext: ReactiveContext = {
        t,
        dt,
        elements: elements.current,
        props: props.current
      }
      for (let drawChild of childrenDraws.current) {
        const component = components.current[drawChild]
        invariant(component.draw, 'Missing draw call')

        // some components only draw on certain updates
        if (!component.update) continue
        component.draw!(topContext)
        if (component.update === true) {
          // turn off draw until the next update is requested
          component.update = false
        }
      }
    }
    if (loop === true) {
      const frameRequest: FrameRequestCallback = () => {
        // this prevents dropped frames
        time.current += 1 / 60
        drawFrame(time.current, 1 / 60)
        animationFrame = requestAnimationFrame(frameRequest)
      }
      animationFrame = requestAnimationFrame(frameRequest)
    } else if (typeof loop === 'number') {
      interval = window.setInterval(() => {
        time.current += loop
        drawFrame(time.current, loop)
      }, loop * 1000)
    }
    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
      if (interval) window.clearInterval(interval)
    }
  }, [allCreated, loop, components])

  return (
    <TopLevelContext.Provider
      value={{
        allCreated,
        registerComponent,
        elements: elements.current,
        props: props.current
      }}
    >
      <div className={`${className}`} style={style}>
        {children}
      </div>
    </TopLevelContext.Provider>
  )
}

export function FrameComponent<Self, Options>({
  options,
  getSelf,
  cleanupSelf,
  children,
  defaultDraw
}: { options: ParentProps<Options, Self> } & {
  getSelf: (options: Options) => Self | Promise<Self>
  cleanupSelf?: (self: Self) => void
  defaultDraw?: (self: Self, context: ReactiveContext, options: Options) => void
} & React.PropsWithChildren) {
  const { self } = useCreateComponent(
    options.name,
    async () => await getSelf(options),
    options,
    options.setup,
    options.draw
      ? (self, context) => {
          options.draw!(self, context)
        }
      : defaultDraw
        ? (self, context) => {
            defaultDraw(self, context, options)
          }
        : options.draw
          ? options.draw
          : undefined,
    options.deps,
    cleanupSelf
  )

  return (
    <FrameContext.Provider
      value={{
        frame: self
      }}
    >
      {self && children}
    </FrameContext.Provider>
  )
}

export function ChildComponent<Self, Options, Frame>({
  options,
  getSelf,
  cleanupSelf,
  children,
  defaultDraw
}: {
  options: ChildProps<Options, Self, Frame>
} & {
  getSelf: (options: Options, frame: Frame) => Self | Promise<Self>
  cleanupSelf?: (self: Self) => void
  defaultDraw?: (self: Self, frame: Frame, context: ReactiveContext, options: Options) => void
} & React.PropsWithChildren) {
  const { frame } = useInvariantContext(FrameContext)
  const { self } = useCreateComponent(
    options.name,
    async () => await getSelf(options, frame),
    options,
    options.setup ? (self, context) => options.setup!(self, frame, context) : undefined,
    options.draw
      ? (self, context) => {
          options.draw!(self, frame, context)
        }
      : defaultDraw
        ? (self, context) => {
            defaultDraw(self, frame, context, options)
          }
        : undefined,
    options.deps,
    cleanupSelf
  )
  return <>{self && children}</>
}

export const Reactive = TopLevelComponent

export const defineChildComponent = <Self, Options, Frame>(
  getSelf: (options: Options, frame: Frame) => Self | Promise<Self>,
  defaultDraw?: (self: Self, frame: Frame, context: ReactiveContext, options: Options) => void,
  cleanupSelf?: (self: Self) => void
) => {
  return (options: ChildProps<Options, Self, Frame>) => (
    <ChildComponent
      options={options}
      getSelf={getSelf}
      cleanupSelf={cleanupSelf}
      defaultDraw={defaultDraw}
    >
      {options.children}
    </ChildComponent>
  )
}

export const defineFrameComponent = <Self, Options>(
  getSelf: (options: Options) => Self,
  defaultDraw?: (self: Self, context: ReactiveContext, options: Options) => void,
  cleanupSelf?: (self: Self) => void
) => {
  return (options: ParentProps<Options, Self>) => (
    <FrameComponent
      options={options}
      getSelf={getSelf}
      cleanupSelf={cleanupSelf}
      defaultDraw={defaultDraw}
    >
      {options.children}
    </FrameComponent>
  )
}
