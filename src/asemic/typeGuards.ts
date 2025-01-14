export function isBrushType<T extends BrushTypes>(
  type: BrushTypes,
  target: T
): type is T {
  return type === target
}
