import { range } from 'lodash'
import {
  AnyPixelFormat,
  ClampToEdgeWrapping,
  DataTexture,
  FloatType,
  LinearFilter,
  MagnificationTextureFilter,
  NearestFilter,
  PixelFormat,
  RedFormat,
  RGBAFormat,
  Vector2
} from 'three'
import { GroupBuilder } from '../Builder'

export const createTexture = (
  array: Float32Array,
  width: number,
  height: number,
  {
    filter = NearestFilter,
    format = RGBAFormat
  }: { filter?: MagnificationTextureFilter; format?: PixelFormat } = {}
) => {
  const tex = new DataTexture(array, width, height, format, FloatType)
  tex.minFilter = tex.magFilter = filter
  tex.wrapS = tex.wrapT = ClampToEdgeWrapping
  return tex
}

export function packToTexture(
  dimensions: Vector2,
  curves: GroupBuilder<any>['curves']
) {
  const width = dimensions.x
  const height = dimensions.y

  const positions = new Float32Array(
    range(height).flatMap(i => {
      const c = curves[i]
      return c
        ? range(width).flatMap(i => {
            const point = c[i]
            return point
              ? [point.x, point.y, point.strength, point.thickness]
              : [-1111, 0, 0, 0]
          })
        : range(width).flatMap(() => [-1111, 0, 0, 0])
    })
  )
  // const positionTex = createTexture(pos, RGBAFormat, LinearFilter)

  const colors = new Float32Array(
    range(height).flatMap(i => {
      const c = curves[i]
      return c
        ? range(width).flatMap(i => {
            const point = c[i]
            return point ? [...point.color, point.alpha] : [-1111, 0, 0, 0]
          })
        : range(width).flatMap(() => [-1111, 0, 0, 0])
    })
  )

  return { positions, colors }
}
