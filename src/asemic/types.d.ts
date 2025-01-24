import { Vector2 } from 'three'
import { float, mrt, varying, vec2, vec4 } from 'three/tsl'
import { GroupBuilder } from './Builder'
import { PointBuilder } from './PointBuilder'
import Backend from 'three/src/renderers/common/Backend.js'

const defaultFn = (input: ReturnType<typeof vec4>) => input
declare global {
  type Coordinate = [number, number] | [number, number, CoordinateData]

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
  type ProgressInfo = {
    p: number
    i: number
  }

  type ParticleInfo = {
    progress: ReturnType<typeof float | typeof varying>
    builder: GroupBuilder
  }

  type ProcessData = {
    recalculate: boolean | number | ((lastFrame: number) => number)
    start: number
    spacing: number
    spacingType: 'count' | 'pixel' | 'width'
    update: boolean
    align: number
    resample: boolean
    maxLength: number
    maxCurves: number
    maxPoints: number
    renderTargets: ReturnTypeq<typeof mrt>
    pointVert: (input: ReturnType<typeof vec2>, info: ParticleInfo) => input
    /**
     * vec4(x, y, strength, thickness), {tPoint: 0-1, tCurve: 0-1}
     */
    curveFrag: (
      input: ReturnType<typeof vec4>,
      info: ParticleInfo & { lastColor: ReturnType<typeof vec4> }
    ) => input
    pointFrag: (
      input: ReturnType<typeof vec4>,
      info: ParticleInfo & { uv: ReturnType<typeof varying> }
    ) => input
    curveVert: (
      input: ReturnType<typeof vec4>,
      info: ParticleInfo & { lastPosition: ReturnType<typeof vec4> }
    ) => input
  }

  type BrushTypes = 'dash' | 'line' | 'attractors'
  type BrushData<T extends BrushTypes> = T extends 'dash'
    ? {
        type: 'dash'
        pointScale: (
          input: ReturnType<typeof vec2>,
          info: ParticleInfo
        ) => input
        pointRotate: (
          input: ReturnType<typeof float>,
          info: ParticleInfo
        ) => input
        dashSize: number
      }
    : T extends 'attractors'
      ? {
          type: 'attractors'
          maxSpeed: number
          minSpeed: number
          damping: number
          initialSpread: boolean
          pointSize: number
          gravityForce: number
          spinningForce: number
          particleCount: number
          pointColor: [number, number, number]
          pointAlpha: number
          pointVelocity: (
            velocity: ReturnType<typeof vec2>,
            position: ReturnType<typeof vec2>,
            info: ParticleInfo
          ) => ReturnType<typeof vec2>
          pointPosition: (
            position: ReturnType<typeof vec2>,
            info: ParticleInfo
          ) => ReturnType<typeof vec2>
        }
      : { type: T }

  type CoordinateData = PreTransformData & Partial<CoordinateSettings>
}

declare module 'three/webgpu' {
  interface WebGPURenderer {
    getContext: () => GPUCanvasContext
    backend: Backend & {
      device: GPUDevice
      utils: {
        getPreferredCanvasFormat: () => GPUTextureFormat
      }
    }
  }
}
