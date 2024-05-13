type TopContextInfo<T extends Record<string, any>> = {
  time: Time
  elements: T
}
type AllowedChildren = JSX.Element | (JSX.Element | JSX.Element[])[]
type DepsOptions = any[] | number | (() => number)
type ParentProps<Props, Self, InternalProps> = Props & {
  name: string
  children?: AllowedChildren
  draw?: (
    self: Self,
    context: TopContextInfo<Record<string, any>>,
    internalProps: InternalProps
  ) => void
  setup?: (
    self: Self,
    context: Omit<TopContextInfo<Record<string, any>>, 'time'>
  ) => InternalProps
  deps?: DepsOptions
}

type ChildProps<Props, Self, Parent, InternalProps> = Props & {
  name: string
  draw?: (
    self: Self,
    parent: Parent,
    context: TopContextInfo<Record<string, any>>,
    internalProps: InternalProps
  ) => void
  setup?: (
    self: Self,
    parent: Parent,
    context: { elements: Record<string, any> }
  ) => InternalProps
  deps?: DepsOptions
}

type Time = { t: number; dt: number }

type ComponentType = {
  draw: ((context: TopContextInfo<Record<string, any>>) => void) | null
  self: any
  update: 'always' | boolean
}

type CanvasComponentProps = {
  className?: string
  width?: number
  height?: number
  id?: string
  resize?: boolean
  hidden?: boolean
  webgl?: boolean
}
