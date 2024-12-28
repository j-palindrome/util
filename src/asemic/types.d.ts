import { Color, Vector2 } from 'three'
import { PointBuilder } from './PointBuilder'

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
  }

  type CoordinateData = PreTransformData & Partial<CoordinateSettings>

  type GroupData = {
    curves: PointBuilder[][]
    transform: TransformData
  }
}
