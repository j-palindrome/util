import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  DataTexture,
  FloatType,
  NearestFilter,
  RenderTarget,
  RGBAFormat,
  Vector2,
  Vector4
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
import {
  StorageBufferAttribute,
  StorageTexture,
  WebGPURenderer
} from 'three/webgpu'
import { bezierPosition, bezierRotation, polyLine } from '../../tsl/curves'
import { textureLoadFix } from '../../tsl/utility'
import { GroupBuilder } from '../Builder'
import { range } from 'lodash'

export function useControlPoints(builder: GroupBuilder<any>) {
  // @ts-ignore
  const renderer = useThree(({ gl }) => gl as WebGPURenderer)
  const resolution = new Vector2()
  renderer.getDrawingBufferSize(resolution)

  const instancesPerCurve = Math.max(
    1,
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
    // const curvePositionTex = new StorageTexture(
    //   builder.settings.maxPoints,
    //   builder.settings.maxCurves
    // )
    // curvePositionTex.type = FloatType
    // const curveColorTex = new StorageTexture(
    //   builder.settings.maxPoints,
    //   builder.settings.maxCurves
    // )
    // curveColorTex.type = FloatType
    const curvePositionArray = instancedArray(
      builder.settings.maxPoints * builder.settings.maxCurves,
      'vec4'
    )
    const curveColorArray = instancedArray(
      builder.settings.maxPoints * builder.settings.maxCurves,
      'vec4'
    )
    const loadPositions = uniformArray(
      range(builder.settings.maxPoints * builder.settings.maxCurves).map(
        x => new Vector4()
      ),
      'vec4'
    )
    const loadColors = uniformArray(
      range(builder.settings.maxPoints * builder.settings.maxCurves).map(
        x => new Vector4()
      ),
      'vec4'
    )
    const controlPointCounts = uniformArray(
      builder.curves.map(x => x.length),
      'int'
    )

    const pointI = instanceIndex.modInt(builder.settings.maxPoints)
    const curveI = instanceIndex.div(builder.settings.maxPoints)

    const advanceControlPoints = Fn(() => {
      const info = {
        progress: curveI
          .toFloat()
          .add(pointI.toFloat().div(controlPointCounts.element(curveI).sub(1))),
        builder
      }
      const index = curveI.mul(builder.settings.maxPoints).add(pointI)
      const thisPosition = loadPositions.element(index)
      curvePositionArray.element(index).assign(
        builder.settings.curvePosition(thisPosition, {
          ...info,
          lastFrame: curvePositionArray.element(index)
        })
      )
      const thisColor = loadColors.element(index)
      curveColorArray.element(index).assign(
        builder.settings.curveColor(thisColor, {
          ...info,
          lastFrame: curveColorArray.element(index)
        })
      )
    })().compute(builder.settings.maxPoints * builder.settings.maxCurves)

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
      const progressVar = progress.toVar()
      If(progressVar.equal(-1), () => {
        extra?.color?.assign(vec4(0, 0, 0, 0))
      }).Else(() => {
        progressVar.assign(
          floor(progress).add(
            builder.settings.pointProgress(progress.fract(), {
              builder,
              progress
            })
          )
        )
        extra?.progress?.assign(progressVar)
        const controlPointsCount = controlPointCounts.element(int(progressVar))
        const subdivisions = select(
          controlPointsCount.equal(2),
          1,
          controlPointsCount.sub(2)
        )

        //4 points: 4-2 = 2 0->1 1->2 (if it goes to the last value then it starts interpolating another curve)
        const t = vec2(
          progressVar.fract().mul(0.999).mul(subdivisions),
          floor(progressVar)
        )
        const index = floor(progressVar)
          .mul(builder.settings.maxPoints)
          .add(progressVar.fract().mul(0.999).mul(subdivisions))

        If(controlPointsCount.equal(2), () => {
          const p0 = curvePositionArray.element(index)
          const p1 = curvePositionArray.element(index.add(1))
          const progressPoint = mix(p0, p1, t.x)

          position.assign(progressPoint.xy)
          if (extra) {
            const index = t.y.mul(builder.settings.maxPoints).add(t.x)
            extra.color?.assign(curveColorArray.element(index))
            extra.thickness?.assign(progressPoint.w)
            extra.rotation?.assign(
              atan(p1.xy.sub(p0.xy).y, p1.xy.sub(p0.xy).x).add(PI2.mul(0.25))
            )
          }
        }).Else(() => {
          const p0 = curvePositionArray.element(index).toVar()
          const p1 = curvePositionArray.element(index.add(1)).toVar()
          const p2 = curvePositionArray.element(index.add(2)).toVar()

          const controlPointsCount = controlPointCounts.element(int(t.y))
          if (builder.settings.adjustEnds) {
            If(t.x.greaterThan(float(1)), () => {
              p0.assign(mix(p0, p1, float(0.5)))
            })
            If(t.x.lessThan(float(controlPointsCount).sub(3)), () => {
              p2.assign(mix(p1, p2, 0.5))
            })
          } else {
            p0.assign(mix(p0, p1, float(0.5)))
            p2.assign(mix(p1, p2, 0.5))
          }

          const strength = p1.z
          const pos = bezierPosition({
            t: t.x.fract(),
            p0: p0.xy,
            p1: p1.xy,
            p2: p2.xy,
            strength
          })

          position.assign(pos)
          const c0 = curveColorArray.element(index)
          const c1 = curveColorArray.element(index.add(1))
          if (extra) {
            extra.color?.assign(mix(c0, c1, t.x.fract()))
            extra.thickness?.assign(
              bezierPosition({
                t: t.x.fract(),
                p0: p0.w,
                p1: p1.w,
                p2: p2.w,
                strength
              })
            )
            extra.rotation?.assign(
              bezierRotation({
                t: t.x.fract(),
                p0: p0.xy,
                p1: p1.xy,
                p2: p2.xy,
                strength
              })
            )
          }
        })
      })
      if (extra) {
        extra.thickness?.assign(
          builder.settings
            .pointThickness(extra.thickness, { progress: progressVar, builder })
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

    const loadControlPoints = Fn(() => {
      curvePositionArray
        .element(instanceIndex)
        .assign(loadPositions.element(instanceIndex))
      curveColorArray
        .element(instanceIndex)
        .assign(loadColors.element(instanceIndex))
    })().compute(builder.settings.maxCurves * builder.settings.maxPoints)

    const reload = () => {
      for (let i = 0; i < builder.settings.maxCurves; i++) {
        controlPointCounts.array[i] = builder.curves[i].length
      }
      const loadColorsArray = loadColors.array as Vector4[]
      const loadPositionsArray = loadPositions.array as Vector4[]
      for (let i = 0; i < builder.settings.maxCurves; i++) {
        const curveIndex = i * builder.settings.maxPoints
        for (let j = 0; j < builder.settings.maxPoints; j++) {
          const point = builder.curves[i]?.[j]
          if (point) {
            loadPositionsArray[curveIndex + j].set(
              point.x,
              point.y,
              point.strength,
              point.thickness
            )
            loadColorsArray[curveIndex + j].set(
              point.color[0],
              point.color[1],
              point.color[2],
              point.alpha
            )
          } else {
            loadPositionsArray[curveIndex + j].set(0, 0, 0, 0)
            loadColorsArray[curveIndex + j].set(0, 0, 0, 0)
          }
        }
      }
      // loadPositions.needsUpdate = true
      // loadColors.needsUpdate = true
      renderer.compute(loadControlPoints)
    }

    const hooks: { onUpdate?: () => void; onInit?: () => void } = {}
    const update = () => {
      if (hooks.onUpdate) {
        hooks.onUpdate()
      }
      renderer.compute(advanceControlPoints)
    }

    const reInitialize = (seconds: number) => {
      builder.reInitialize(seconds)
      reload()
      if (hooks.onInit) {
        hooks.onInit()
      }
    }

    return {
      curvePositionArray,
      curveColorArray,
      controlPointCounts,
      getBezier,
      reInitialize,
      hooks,
      update,
      reload
    }
  }, [builder])

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
            ? state.clock.elapsedTime + 1 / 60
            : typeof r === 'number'
              ? state.clock.elapsedTime + r / 1000
              : state.clock.elapsedTime + r(nextTime.current * 1000) / 1000
        data.reInitialize(state.clock.elapsedTime)
      }
    }
    data.update()
  })

  useEffect(() => {
    data.reInitialize(nextTime.current)
    return () => {
      data.curvePositionArray.dispose()
      data.curveColorArray.dispose()
    }
  }, [builder])

  return {
    getBezier: data.getBezier,
    resolution,
    instancesPerCurve,
    hooks: data.hooks
  }
}
