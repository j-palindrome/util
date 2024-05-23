'use client'

import { Children, createContext, useEffect, useRef, useState } from 'react'
import invariant from 'tiny-invariant'
import { useInvariantContext } from '../../src/react'
import { omit } from 'lodash'

function useCreateComponent<Self, InternalProps>(
  name: string,
  getSelf: () => Self | Promise<Self>,
  options: Record<string, any>,
  setupSelf?: (
    self: Self,
    context: Omit<TopContextInfo<Record<string, any>>, 'time'>
  ) => InternalProps,
  drawSelf?: (
    self: Self,
    context: TopContextInfo<Record<string, any>>,
    props: InternalProps
  ) => void,
  drawSelfDeps?: DepsOptions,
  cleanupSelf?: (self: Self) => void
) {
  const { allCreated, registerComponent, elements } = useInvariantContext(
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

  const propsRef = useRef<InternalProps>(null!)

  const recreateDeps = Object.values(omit(options, 'name', 'setup', 'draw', 'children', 'deps'))
    .map((x) => x.toString())
    .join(';')

  useEffect(() => {
    if (!self) return

    registerComponent(name, {
      self,
      draw: drawSelf ? (context) => drawSelf(self, context, propsRef.current) : null,
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
      draw: drawSelf ? (context) => drawSelf(self, context, propsRef.current) : null
    })
  }, [drawSelf])

  useEffect(() => {
    if (!self || !setupSelf || !allCreated) return
    propsRef.current = setupSelf(self, { elements })
    return () => {
      cleanupSelf && cleanupSelf(self)
    }
  }, [allCreated, setupSelf])
  return { self }
}

const TopLevelContext = createContext<{
  registerComponent: (name: string, component: Partial<ComponentType> | null) => void
  elements: Record<string, any>
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
    console.info('initialized with components', elements.current)

    let animationFrame: number
    let interval: number
    const drawFrame = (time: Time) => {
      const topContext = { time, elements: elements.current }
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
      const frameRequest: FrameRequestCallback = (t) => {
        drawFrame({ t, dt: t - time.current })
        time.current = t
        animationFrame = requestAnimationFrame(frameRequest)
      }
      animationFrame = requestAnimationFrame(frameRequest)
    } else if (typeof loop === 'number') {
      interval = window.setInterval(() => {
        time.current += loop
        drawFrame({ t: time.current, dt: time.current - loop })
      }, loop)
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
        elements: elements.current
      }}
    >
      <div className={`${className}`} style={style}>
        {children}
      </div>
    </TopLevelContext.Provider>
  )
}

export function FrameComponent<Self, Options, InternalProps>({
  options,
  getSelf,
  cleanupSelf,
  children
}: { options: ParentProps<Options, Self, InternalProps> } & {
  getSelf: (options: Options) => Self | Promise<Self>
  cleanupSelf?: (self: Self) => void
} & React.PropsWithChildren) {
  const { self } = useCreateComponent(
    options.name,
    async () => await getSelf(options),
    options,
    options.setup,
    options.draw,
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

export const defineFrameComponent = <Self, Options, InternalProps>(
  getSelf: (options: Options) => Self,
  cleanupSelf?: (self: Self) => void
) => {
  return (options: ParentProps<Options, Self, InternalProps>) => (
    <FrameComponent options={options} getSelf={getSelf} cleanupSelf={cleanupSelf}>
      {options.children}
    </FrameComponent>
  )
}

export function ChildComponent<Self, Options, Context, InternalProps>({
  options,
  getSelf,
  cleanupSelf,
  children
}: {
  options: ChildProps<Options, Self, Context, InternalProps>
} & {
  getSelf: (options: Options, context: Context) => Self | Promise<Self>
  cleanupSelf?: (self: Self) => void
} & React.PropsWithChildren) {
  const { frame } = useInvariantContext(FrameContext)
  const { self } = useCreateComponent(
    options.name,
    async () => await getSelf(options, frame),
    options,
    options.setup ? (self, context) => options.setup!(self, frame, context) : undefined,
    options.draw
      ? (self, context, internalProps) => options.draw!(self, frame, context, internalProps)
      : undefined,
    options.deps,
    cleanupSelf
  )
  return <>{self && children}</>
}

export const defineChildComponent = <Self, Options, Parent, InternalProps>(
  getSelf: (options: Options, context: Parent) => Self,
  cleanupSelf?: (self: Self) => void
) => {
  return (options: ChildProps<Options, Self, Parent, InternalProps>) => (
    <ChildComponent options={options} getSelf={getSelf} cleanupSelf={cleanupSelf}>
      {options.children}
    </ChildComponent>
  )
}

export const Reactive = TopLevelComponent
