import { Color, Vector2 } from 'three'
import { PointBuilder } from './PointBuilder'
import { float, Fn, ShaderNodeObject, vec2, vec4 } from 'three/tsl'
import { Builder } from './Builder'

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

  type ParticleInfo = {
    pointUV: ReturnType<typeof vec2>
    aspectRatio: ReturnType<typeof float>
    settings: Builder['settings']
  }

  type ProcessData = {
    spacingType: 'count' | 'pixel' | 'width'
    recalculate: boolean | number | ((lastFrame: number) => number)
    start: number
    gap: number
    update: boolean
    align: number
    resample: boolean
    maxLength: number
    maxCurves: number
    maxPoints: number
    pointScale: (input: ReaturnType<typeof vec2>) => input
    pointRotate: (input: ReturnType<typeof float>, info: ParticleInfo) => input
    pointVert: (input: ReturnType<typeof vec2>, info: ParticleInfo) => input
    /**
     * vec4(x, y, strength, thickness), {tPoint: 0-1, tCurve: 0-1}
     */
    curveFrag: (
      input: ReturnType<typeof vec4>,
      info: ParticleInfo & { lastColor: ReturnType<typeof vec4> }
    ) => input
    pointFrag: (input: ReturnType<typeof vec4>, info: ParticleInfo) => input
    curveVert: (
      input: ReturnType<typeof vec4>,
      info: ParticleInfo & { lastPosition: ReturnType<typeof vec4> }
    ) => input
  }

  type CoordinateData = PreTransformData & Partial<CoordinateSettings>
  type GroupData = {
    curves: PointBuilder[][]
    transform: TransformData
    settings: PreTransformData & CoordinateSettings & ProcessData
  }
}
