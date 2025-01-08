import { Color, Vector2 } from 'three'
import { PointBuilder } from './PointBuilder'
import { float, Fn, ShaderNodeObject, vec2, vec4 } from 'three/tsl'

const defaultFn = (input: ReturnType<typeof vec4>) => input
declare global {
  type Coordinate = [number, number, CoordinateData] | [number, number]

  type TransformData = {
    translate: Vector2
    scale: Vector2
    rotate: number
  }

  type PreTransformData = {
    push?: true
    reset?: true | 'last' | 'pop' | 'group'
    translate?: [number, number] | PointBuilder
    scale?: [number, number] | number | PointBuilder
    rotate?: number
    remap?: [[number, number] | PointBuilder, [number, number] | PointBuilder]
    new?: 'group' | 'curve'
  }

  type CoordinateSettings = {
    strength: number
    thickness: number
    color: [number, number, number]
    alpha: number
    spacing: number
    gap: number
  }

  type ProcessData = {
    spacingType: 'count' | 'pixel' | 'width'
    recalculate: boolean | number | (() => number)
    update: boolean
    maxLength: number
    maxCurves: number
    maxPoints: number
    pointVert: (
      input: ReturnType<typeof vec2>,
      pointCurve: ReturnType<typeof vec2>,
      aspectRatio: ReturnType<typeof float>
    ) => input
    rotateVert: (
      input: ReturnType<typeof float>,
      pointCurve: ReturnType<typeof vec2>,
      aspectRatio: ReturnType<typeof float>
    ) => input
    scaleVert: (
      input: ReturnType<typeof vec2>,
      pointCurve: ReturnType<typeof vec2>,
      aspectRatio: ReturnType<typeof float>
    ) => input
    /**
     * vec4(x, y, strength, thickness), {tPoint: 0-1, tCurve: 0-1}
     */
    curveFrag: (
      input: ReturnType<typeof vec4>,
      pointCurve: ReturnType<typeof vec2>,
      aspectRatio: ReturnType<typeof float>
    ) => input
    pointFrag: typeof defaultFn
    curveVert: (
      input: ReturnType<typeof vec4>,
      pointCurve: ReturnType<typeof vec2>,
      aspectRatio: ReturnType<typeof float>
    ) => input
  }

  type CoordinateData = PreTransformData & Partial<CoordinateSettings>
  type GroupData = {
    curves: PointBuilder[][]
    transform: TransformData
    settings: PreTransformData & CoordinateSettings & ProcessData
  }
}
