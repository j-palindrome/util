import { vec4 } from 'three/tsl'

export function isBrushType<T extends BrushTypes>(
  type: BrushTypes,
  target: T
): type is T {
  return type === target
}

export const isTransformData = (transform: any): transform is TransformData =>
  transform?.['isTransformData'] ? true : false

export const toTuple = <T extends any[]>(...args: T): T => args

const defaultFn = (input: ReturnType<typeof vec4>) => input
