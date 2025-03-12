import { Color, Texture, TypedArray, Vector2 } from 'three'
import Backend from 'three/src/renderers/common/Backend.js'
import { float, mrt, varying, vec2, vec4 } from 'three/tsl'
import GroupBuilder from './builders/GroupBuilder'
import BrushBuilder from './builders/BrushBuilder'

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
    translate?: [number, number] | Vector2
    scale?: [number, number] | number | Vector2
    rotate?: number
    remap?: [[number, number] | Vector2, [number, number] | Vector2]
    new?: 'group' | 'curve'
  }

  type CoordinateSettings = {
    strength: number
    thickness: number
    color: [number, number, number] | Color
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

  type ProcessData<T extends BrushTypes> = {
    renderInit: boolean | number | ((lastFrame: number) => number)
    renderStart: number | (() => number)
    renderClear: boolean
    spacing: number
    spacingType: 'count' | 'pixel' | 'width'
    align: number
    resample: boolean
    maxLength: number
    maxCurves: number
    maxPoints: number
    renderTargets: ReturnType<typeof mrt>
    adjustEnds: boolean | 'loop'
    squareAspect: boolean
    pointPosition: (
      input: ReturnType<typeof vec2>,
      info: ParticleInfo
    ) => typeof input
    pointThickness: (
      input: ReturnType<typeof float>,
      info: ParticleInfo
    ) => typeof input
    pointRotate: (
      input: ReturnType<typeof float>,
      info: ParticleInfo
    ) => typeof input
    /**
     * vec4(x, y, strength, thickness), {tPoint: 0-1, tCurve: 0-1}
     */
    curveColor: (
      input: ReturnType<typeof vec4>,
      info: ParticleInfo & {
        lastFrame: ReturnType<typeof vec4>
      }
    ) => typeof input
    pointColor: (
      input: ReturnType<typeof vec4>,
      info: ParticleInfo & { uv: ReturnType<typeof float | typeof varying> }
    ) => typeof input
    pointProgress: (
      input: ReturnType<typeof float>,
      info: ParticleInfo
    ) => typeof input
    curvePosition: (
      input: ReturnType<typeof vec4>,
      info: ParticleInfo & {
        lastFrame: ReturnType<typeof vec4>
      }
    ) => typeof input
    onUpdate?: (b: BrushBuilder<T>) => void
    onInit?: (b: BrushBuilder<T>) => void
    onClick?: (b: BrushBuilder<T>) => void
    onDrag?: (b: BrushBuilder<T>) => void
    onOver?: (b: BrushBuilder<T>) => void
  }

  type BrushTypes = 'dash' | 'line' | 'particles' | 'stripe' | 'blob' | 'dot'
  type BrushData<T extends BrushTypes> = T extends 'dash'
    ? {
        type: 'dash'
        dashSize: number
      }
    : T extends 'particles'
    ? {
        type: 'particles'
        initialSpread: boolean
        speedMax: number
        speedMin: number
        speedDamping: number
        speedFrame: number
        particleSize: number
        attractorPull: number
        attractorPush: number
        particleCount: number
        particleVelocity: (
          velocity: ReturnType<typeof vec2>,
          position: ReturnType<typeof vec2>,
          info: ParticleInfo
        ) => ReturnType<typeof vec2>
        particlePosition: (
          position: ReturnType<typeof vec2>,
          info: ParticleInfo
        ) => ReturnType<typeof vec2>
      }
    : T extends 'blob'
    ? { type: T; centerMode: 'center' | 'first' | 'betweenEnds' }
    : { type: T }

  type CoordinateData = PreTransformData &
    Partial<{
      [T in keyof CoordinateSettings]:
        | CoordinateSettings[T]
        | ((progress: [number, number]) => CoordinateSettings[T])
    }>

  type BrushProps<T extends BrushTypes> = {
    children: ConstructorParameters<typeof GroupBuilder>[0]
    type: T
  } & Omit<Partial<BrushBuilder<T>['settings']>, 'type'>
}

declare module 'three/webgpu' {
  interface WebGPUTextureUtils {
    _getBytesPerTexel: (format: any) => number
    _getTypedArrayType: (format: any) => TypedArray
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
