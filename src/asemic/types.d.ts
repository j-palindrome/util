import { Texture, TypedArray, Vector2 } from 'three'
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
    isTransformData: true
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

  type ParticleInfo<T extends BrushTypes> = {
    progress: ReturnType<typeof float | typeof varying>
    builder: GroupBuilder<T>
  }

  type ProcessData<T extends BrushTypes> = {
    renderInit: boolean | number | ((lastFrame: number) => number)
    renderUpdate: boolean | number | ((lastFrame: number) => number)
    renderStart: number | (() => number)
    spacing: number
    spacingType: 'count' | 'pixel' | 'width'
    align: number
    resample: boolean
    maxLength: number
    maxCurves: number
    maxPoints: number
    adjustEnds: boolean
    renderTargets: ReturnTypeq<typeof mrt>
    pointPosition: (input: ReturnType<typeof vec2>, info: ParticleInfo) => input
    pointThickness: (
      input: ReturnType<typeof float>,
      info: ParticleInfo<T>
    ) => input
    pointRotate: (input: ReturnType<typeof float>, info: ParticleInfo) => input
    /**
     * vec4(x, y, strength, thickness), {tPoint: 0-1, tCurve: 0-1}
     */
    curveColor: (
      input: ReturnType<typeof vec4>,
      info: ParticleInfo<T> & {
        lastFrame: ReturnType<typeof vec4>
      }
    ) => input
    pointColor: (
      input: ReturnType<typeof vec4>,
      info: ParticleInfo<T> & { uv: ReturnType<typeof float | typeof varying> }
    ) => input
    pointProgress: (
      input: ReturnType<typeof float>,
      info: ParticleInfo<T>
    ) => input
    curvePosition: (
      input: ReturnType<typeof vec4>,
      info: ParticleInfo<T> & {
        lastFrame: ReturnType<typeof vec4>
      }
    ) => input
    onUpdate: (builder: GroupBuilder<T>) => void
    onInit: (builder: GroupBuilder<T>) => void
  }

  type BrushTypes = 'dash' | 'line' | 'attractors'
  type BrushData<T extends BrushTypes> = T extends 'dash'
    ? {
        type: 'dash'
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
          particleColor: [number, number, number]
          particleAlpha: number
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
  interface WebGPUTextureUtils {
    _getBytesPerTexel: (format: any) => number
    _getTypedArrayType: (format: any) => typeof TypedArray
  }
  interface WebGPURenderer {
    getContext: () => GPUCanvasContext
    backend: Backend & {
      get: (item: any) => any
      textureUtils: WebGPUTextureUtils
      device: GPUDevice
      colorBuffer: GPUTexture
      copyTextureToBuffer: (
        texture: Texture,
        x: number,
        y: number,
        width: number,
        height: number
      ) => Promise<TypedArray>
      utils: {
        getPreferredCanvasFormat: () => GPUTextureFormat
      }
    }
  }
}
