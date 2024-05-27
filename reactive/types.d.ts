type ReactiveContext<
  Elements extends Record<string, any> = any,
  Props extends Record<string, any> = any
> = {
  t: number
  dt: number
  elements: Elements
  props: Props
}
type AllowedChildren = JSX.Element | (JSX.Element | JSX.Element[])[]
type DepsOptions = any[] | number | (() => number)
type ParentProps<Props, Self> = Props & {
  name: string
  draw?: (self: Self, context: ReactiveContext) => void
  setup?: (self: Self, context: Omit<ReactiveContext, 'time'>) => void
  deps?: DepsOptions
} & React.PropsWithChildren

type ChildProps<Props, Self, Parent> = Props & {
  name: string
  draw?: (self: Self, parent: Parent, context: ReactiveContext) => void
  setup?: (self: Self, parent: Parent, context: Omit<ReactiveContext, 'time'>) => void
  deps?: DepsOptions
} & React.PropsWithChildren

type ComponentType = {
  draw: ((context: ReactiveContext) => void) | null
  self: any
  update: 'always' | boolean
}

type CanvasComponentProps = {
  className?: string
  width?: number
  height?: number
  id?: string
  noResize?: true
  hidden?: boolean
  webgl?: boolean
}
