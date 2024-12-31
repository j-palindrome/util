import { Color, Vector2 } from 'three'
import { PointBuilder } from './PointBuilder'
import { Fn, ShaderNodeObject, vec2, vec4 } from 'three/tsl'

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
  }

  type ProcessData = {
    recalculate: boolean | ((progress: number) => number)
    pointVert: (input: ReturnType<typeof vec2>) => input
    curveVert: typeof defaultFn
    pointFrag: typeof defaultFn
    curveFrag: typeof defaultFn
  }

  type CoordinateData = PreTransformData & Partial<CoordinateSettings>
  type GroupData = {
    curves: PointBuilder[][]
    transform: TransformData
    settings: PreTransformData & CoordinateSettings & ProcessData
  }
}
