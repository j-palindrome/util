import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  DataTexture,
  FloatType,
  NearestFilter,
  RenderTarget,
  RGBAFormat,
  Vector2
} from 'three'
import { Fn } from 'three/src/nodes/TSL.js'
import {
  atan,
  Break,
  float,
  floor,
  If,
  instancedArray,
  instanceIndex,
  int,
  ivec2,
  Loop,
  mix,
  PI2,
  remap,
  screenSize,
  select,
  texture,
  textureLoad,
  textureStore,
  uniformArray,
  varying,
  varyingProperty,
  vec2,
  vec4
} from 'three/tsl'
import { StorageTexture, WebGPURenderer } from 'three/webgpu'
import { bezierPosition, bezierRotation } from '../../tsl/curves'
import { textureLoadFix } from '../../tsl/utility'
import { GroupBuilder } from '../Builder'

export function useControlPoints(builder: GroupBuilder<any>) {
  // @ts-ignore
  const gl = useThree(({ gl }) => gl as WebGPURenderer)
  const resolution = new Vector2()
  gl.getDrawingBufferSize(resolution)

  const instancesPerCurve = Math.max(
    2,
    Math.floor(
      builder.settings.spacingType === 'pixel'
        ? (builder.settings.maxLength * resolution.x) / builder.settings.spacing
        : builder.settings.spacingType === 'width'
          ? (builder.settings.maxLength * resolution.x) /
            (builder.settings.spacing * resolution.x)
          : builder.settings.spacingType === 'count'
            ? builder.settings.spacing
            : 0
    )
  )

  const data = useMemo(() => {
    const curvePositionTex = new StorageTexture(
      builder.settings.maxPoints,
      builder.settings.maxCurves
    )
    curvePositionTex.type = FloatType
    const curveColorTex = new StorageTexture(
      builder.settings.maxPoints,
      builder.settings.maxCurves
    )
    curveColorTex.type = FloatType
    const curveColorFeedback = new StorageTexture(
      builder.settings.maxPoints,
      builder.settings.maxCurves
    )
    curveColorFeedback.type = FloatType
    const curvePositionFeedback = new StorageTexture(
      builder.settings.maxPoints,
      builder.settings.maxCurves
    )
    curvePositionFeedback.type = FloatType
    const controlPointCounts = uniformArray(
      builder.curves.map(x => x.length),
      'int'
    )

    const positionTex = new DataTexture(
      new Float32Array(
        builder.settings.maxPoints * builder.settings.maxCurves * 4
      ),
      builder.settings.maxPoints,
      builder.settings.maxCurves,
      RGBAFormat,
      FloatType,
      undefined,
      undefined,
      undefined,
      NearestFilter,
      NearestFilter
    )
    const colorTex = new DataTexture(
      new Float32Array(
        builder.settings.maxPoints * builder.settings.maxCurves * 4
      ),
      builder.settings.maxPoints,
      builder.settings.maxCurves,
      RGBAFormat,
      FloatType
    )

    const pointI = instanceIndex.modInt(builder.settings.maxPoints)
    const curveI = instanceIndex.div(builder.settings.maxPoints)

    const curvePositionTexU = texture(curvePositionTex)
    const curveColorTexU = texture(curveColorTex)
    const lastCurvePositionTexU = texture(curvePositionFeedback)
    const lastCurveColorTexU = texture(curveColorFeedback)

    const curvePositionLoadU = textureLoad(positionTex, vec2(pointI, curveI))
    const curveColorLoadU = textureLoad(colorTex, vec2(pointI, curveI))
    const lastCurvePositionLoadU = textureLoad(
      positionTex,
      vec2(pointI, curveI)
    )
    const lastCurveColorLoadU = textureLoad(colorTex, vec2(pointI, curveI))

    const advanceControlPoints = Fn(() => {
      const info = {
        progress: curveI.add(
          pointI.toFloat().div(controlPointCounts.element(curveI).sub(1))
        ),
        builder
      }
      const point = builder.settings.curvePosition(vec4(curvePositionLoadU), {
        ...info,
        lastPosition: vec4(lastCurvePositionLoadU),
        lastFramePosition: vec4(lastCurvePositionTexU)
      })
      textureStore(curvePositionTex, vec2(pointI, curveI), point).toWriteOnly()

      const color = builder.settings.curveColor(vec4(curveColorLoadU), {
        ...info,
        lastColor: vec4(lastCurveColorLoadU),
        lastFrameColor: vec4(lastCurveColorTexU)
      })
      return textureStore(
        curveColorTex,
        vec2(pointI, curveI),
        color
      ).toWriteOnly()
    })().compute(
      builder.settings.maxPoints * builder.settings.maxCurves,
      undefined as any
    )

    const getBezier = (
      progress: ReturnType<typeof float>,
      position: ReturnType<typeof vec2>,
      extra?: {
        rotation?: ReturnType<typeof float>
        thickness?: ReturnType<typeof float>
        color?: ReturnType<typeof varying>
        progress?: ReturnType<typeof varying>
      }
    ) => {
      extra?.progress?.assign(progress)
      If(progress.equal(-1), () => {
        extra?.color?.assign(vec4(0, 0, 0, 0))
      }).Else(() => {
        const controlPointsCount = controlPointCounts.element(int(progress))
        const subdivisions = select(
          controlPointsCount.equal(2),
          1,
          controlPointsCount.sub(2)
        )

        //4 points: 4-2 = 2 0->1 1->2 (if it goes to the last value then it starts interpolating another curve)
        const t = vec2(
          progress.fract().mul(0.999).mul(subdivisions),
          floor(progress)
        )

        If(controlPointsCount.equal(2), () => {
          const p0 = textureLoadFix(curvePositionTexU, ivec2(0, t.y)).xy
          const p1 = textureLoadFix(curvePositionTexU, ivec2(1, t.y)).xy
          const progressPoint = mix(p0, p1, t.x)

          position.assign(progressPoint)
          if (extra) {
            const textureVector = vec2(
              t.x.add(0.5).div(builder.settings.maxPoints),
              t.y.add(0.5).div(builder.settings.maxCurves)
            )
            extra.color?.assign(vec4(curveColorTexU.sample(textureVector)))
            extra.thickness?.assign(curvePositionTexU.sample(textureVector).w)
            extra.rotation?.assign(
              atan(p1.sub(p0).y, p1.sub(p0).x).add(PI2.mul(0.25))
            )
          }
        }).Else(() => {
          const p0 = textureLoadFix(
            curvePositionTexU,
            ivec2(t.x, t.y)
          ).xy.toVar()
          const p1 = textureLoadFix(
            curvePositionTexU,
            ivec2(t.x.add(1), t.y)
          ).xy
          const p2 = textureLoadFix(
            curvePositionTexU,
            ivec2(t.x.add(2), t.y)
          ).xy.toVar()

          If(t.x.greaterThan(float(1)), () => {
            p0.assign(mix(p0, p1, float(0.5)))
          })
          const controlPointsCount = controlPointCounts.element(int(t.y))
          If(t.x.lessThan(float(controlPointsCount).sub(3)), () => {
            p2.assign(mix(p1, p2, 0.5))
          })
          const strength = textureLoadFix(
            curvePositionTexU,
            ivec2(t.x.add(1), t.y)
          ).z
          const pos = bezierPosition({
            t: t.x.fract(),
            p0,
            p1,
            p2,
            strength
          })

          position.assign(pos)
          if (extra) {
            const tt = vec2(
              // 2 points: 0.5-1.5
              t.x
                .div(controlPointsCount.sub(2))
                .mul(controlPointsCount.sub(1))
                .add(0.5)
                .div(builder.settings.maxPoints),
              t.y.add(0.5).div(builder.settings.maxCurves)
            )
            extra.color?.assign(vec4(texture(curveColorTex, tt)))
            extra.thickness?.assign(texture(curvePositionTex, tt).w)
            extra.rotation?.assign(
              bezierRotation({ t: t.x.fract(), p0, p1, p2, strength })
            )
          }
        })
      })
      if (extra) {
        extra.thickness?.assign(
          builder.settings
            .pointThickness(extra.thickness, { progress, builder })
            .div(screenSize.x)
        )
        extra.rotation?.assign(
          builder.settings.pointRotate(extra.rotation!, {
            progress: extra.progress!,
            builder
          })
        )
      }
    }

    const reload = () => {
      for (let i = 0; i < builder.settings.maxCurves; i++) {
        controlPointCounts.array[i] = builder.curves[i].length
      }

      // const temp = lastCurvePositionLoadU.value
      // const temp2 = lastCurveColorLoadU.value
      // lastCurvePositionLoadU.value = curvePositionLoadU.value
      // lastCurveColorLoadU.value = curveColorLoadU.value
      // curvePositionLoadU.value = temp
      // curveColorLoadU.value = temp2
      // lastCurvePositionLoadU.value.needsUpdate = true
      // lastCurveColorLoadU.value.needsUpdate = true
      // curvePositionLoadU.value.needsUpdate = true
      // curveColorLoadU.value.needsUpdate = true

      const loadPositions = curvePositionLoadU.value.source.data
        .data as Float32Array
      const loadColors = curveColorLoadU.value.source.data.data as Float32Array
      for (let i = 0; i < builder.settings.maxCurves; i++) {
        const curveIndex = i * 4 * builder.settings.maxPoints
        for (let j = 0; j < builder.settings.maxPoints; j++) {
          const point = builder.curves[i]?.[j]
          if (point) {
            loadPositions.set(
              [point.x, point.y, point.strength, point.thickness],
              curveIndex + j * 4
            )
            loadColors.set(
              [point.color[0], point.color[1], point.color[2], point.alpha],
              curveIndex + j * 4
            )
          } else {
            loadPositions.set([0, 0, 0, 0], curveIndex + j * 4)
            loadColors.set([0, 0, 0, 0], curveIndex + j * 4)
          }
        }
      }

      curvePositionLoadU.value.needsUpdate = true
      curveColorLoadU.value.needsUpdate = true
    }

    const hooks: { onUpdate?: () => void; onInit?: () => void } = {}
    const update = (again = true) => {
      builder.settings.onUpdate(builder)
      // internal brush updating
      if (hooks.onUpdate) {
        hooks.onUpdate()
      }

      // const temp = lastCurvePositionTexU.value
      // const temp2 = lastCurveColorTexU.value
      // lastCurvePositionTexU.value = curvePositionTexU.value
      // lastCurveColorTexU.value = curveColorTexU.value
      // curvePositionTexU.value = temp
      // curveColorTexU.value = temp2
      // lastCurveColorTexU.needsUpdate = true
      // lastCurvePositionTexU.needsUpdate = true
      // curveColorTexU.needsUpdate = true
      // curvePositionTexU.needsUpdate = true

      if (!builder.settings.renderUpdate) return
      if (builder.settings.renderUpdate.includes('cpu')) {
        gl.compute(advanceControlPoints)
      }
      if (builder.settings.renderUpdate.includes('gpu')) {
        reload()
      }
      if (again) {
        updating = requestAnimationFrame(() => update())
      }
    }

    const reInitialize = () => {
      builder.reInitialize()
      reload()

      update(false)
      builder.settings.onInit(builder)
      if (hooks.onInit) {
        hooks.onInit()
      }
    }

    return {
      advanceControlPoints,
      curvePositionLoadU,
      curveColorLoadU,
      lastCurvePositionLoadU,
      lastCurveColorLoadU,
      curvePositionTex,
      curveColorTex,
      controlPointCounts,
      getBezier,
      reInitialize,
      hooks,
      update
    }
  }, [builder])

  let updating: number

  const nextTime = useRef<number>(
    (typeof builder.settings.renderStart === 'function'
      ? builder.settings.renderStart()
      : builder.settings.renderStart) / 1000
  )

  useFrame(state => {
    if (state.clock.elapsedTime > nextTime.current) {
      if (builder.settings.renderInit) {
        const r = builder.settings.renderInit
        nextTime.current =
          typeof r === 'boolean'
            ? nextTime.current + 1 / 60
            : typeof r === 'number'
              ? nextTime.current + r / 1000
              : nextTime.current + r(nextTime.current * 1000) / 1000
        data.reInitialize()
      }
    }
  })

  useEffect(() => {
    updating = requestAnimationFrame(() => data.update())

    return () => {
      cancelAnimationFrame(updating)
    }
  }, [builder])

  useEffect(() => {
    data.reInitialize()
    return () => {
      data.curvePositionTex.dispose()
      data.curveColorTex.dispose()
    }
  }, [builder])

  return {
    getBezier: data.getBezier,
    resolution,
    instancesPerCurve,
    hooks: data.hooks
  }
}
