export function isBrushType<T extends BrushTypes>(
  type: BrushTypes,
  target: T
): type is T {
  return type === target
}

export const isTransformData = (transform: any): transform is TransformData =>
  transform?.['isTransformData'] ? true : false
