import { Texture, TypedArray, Vector2 } from "three";
import Backend from "three/src/renderers/common/Backend.js";
import { float, mrt, varying, vec2, vec4 } from "three/tsl";
import { GroupBuilder } from "./builders/Builder";

declare global {
  type Coordinate = [number, number] | [number, number, CoordinateData];

  type TransformData = {
    translate: Vector2;
    scale: Vector2;
    rotate: number;
    isTransformData: true;
  };

  type PreTransformData = {
    push?: true;
    reset?: true | "last" | "pop" | "group";
    translate?: [number, number] | Vector2;
    scale?: [number, number] | number | Vector2;
    rotate?: number;
    remap?: [[number, number] | Vector2, [number, number] | Vector2];
    new?: "group" | "curve";
  };

  type CoordinateSettings = {
    strength: number;
    thickness: number;
    color: [number, number, number];
    alpha: number;
  };
  type ProgressInfo = {
    p: number;
    i: number;
  };

  type ParticleInfo<T extends BrushTypes> = {
    progress: ReturnType<typeof float | typeof varying>;
    builder: GroupBuilder<T, any>;
  };

  type ProcessData<T extends BrushTypes, K extends Record<string, any>> = {
    renderInit: boolean | number | ((lastFrame: number) => number);
    renderStart: number | (() => number);
    renderClear: boolean;
    spacing: number;
    spacingType: "count" | "pixel" | "width";
    align: number;
    resample: boolean;
    maxLength: number;
    maxCurves: number;
    maxPoints: number;
    renderTargets: ReturnType<typeof mrt>;
    adjustEnds: boolean | "loop";
    squareAspect: boolean;
    pointPosition: (
      input: ReturnType<typeof vec2>,
      info: ParticleInfo<T>,
    ) => typeof input;
    pointThickness: (
      input: ReturnType<typeof float>,
      info: ParticleInfo<T>,
    ) => typeof input;
    pointRotate: (
      input: ReturnType<typeof float>,
      info: ParticleInfo<T>,
    ) => typeof input;
    /**
     * vec4(x, y, strength, thickness), {tPoint: 0-1, tCurve: 0-1}
     */
    curveColor: (
      input: ReturnType<typeof vec4>,
      info: ParticleInfo<T> & {
        lastFrame: ReturnType<typeof vec4>;
      },
    ) => typeof input;
    pointColor: (
      input: ReturnType<typeof vec4>,
      info: ParticleInfo<T> & { uv: ReturnType<typeof float | typeof varying> },
    ) => typeof input;
    pointProgress: (
      input: ReturnType<typeof float>,
      info: ParticleInfo<T>,
    ) => typeof input;
    curvePosition: (
      input: ReturnType<typeof vec4>,
      info: ParticleInfo<T> & {
        lastFrame: ReturnType<typeof vec4>;
      },
    ) => typeof input;
    onUpdate: (builder: GroupBuilder<T, K>) => void;
    onInit: (builder: GroupBuilder<T, K>) => void;
  };

  type BrushTypes = "dash" | "line" | "particles" | "stripe" | "blob" | "dot";
  type BrushData<T extends BrushTypes> = T extends "dash"
    ? {
        type: "dash";
        dashSize: number;
      }
    : T extends "particles"
      ? {
          type: "particles";
          initialSpread: boolean;
          speedMax: number;
          speedMin: number;
          speedDamping: number;
          particleSize: number;
          attractorPull: number;
          attractorPush: number;
          particleCount: number;
          particleVelocity: (
            velocity: ReturnType<typeof vec2>,
            position: ReturnType<typeof vec2>,
            info: ParticleInfo<T>,
          ) => ReturnType<typeof vec2>;
          particlePosition: (
            position: ReturnType<typeof vec2>,
            info: ParticleInfo<T>,
          ) => ReturnType<typeof vec2>;
        }
      : T extends "blob"
        ? { type: T; centerMode: "center" | "first" | "betweenEnds" }
        : { type: T };

  type CoordinateData = PreTransformData &
    Partial<{
      [T in keyof CoordinateSettings]:
        | CoordinateSettings[T]
        | ((progress: [number, number]) => CoordinateSettings[T]);
    }>;
}

declare module "three/webgpu" {
  interface WebGPUTextureUtils {
    _getBytesPerTexel: (format: any) => number;
    _getTypedArrayType: (format: any) => TypedArray;
  }

  interface WebGPURenderer {
    getContext: () => GPUCanvasContext;
    backend: Backend & {
      get: (item: any) => any;
      textureUtils: WebGPUTextureUtils;
      device: GPUDevice;
      colorBuffer: GPUTexture;
      copyTextureToBuffer: (
        texture: Texture,
        x: number,
        y: number,
        width: number,
        height: number,
      ) => Promise<TypedArray>;
      utils: {
        getPreferredCanvasFormat: () => GPUTextureFormat;
      };
    };
  }
}
