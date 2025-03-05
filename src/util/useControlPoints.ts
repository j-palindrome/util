import { useFrame, useThree } from '@react-three/fiber'
import { range } from 'lodash'
import { useCallback, useEffect, useRef } from 'react'
import { Vector2, Vector4 } from 'three'
import { Fn } from 'three/src/nodes/TSL.js'
import {
  atan,
  float,
  floor,
  If,
  instancedArray,
  instanceIndex,
  int,
  mix,
  screenSize,
  select,
  uniformArray,
  varying,
  vec2,
  vec4,
} from 'three/tsl'
import { WebGPURenderer } from 'three/webgpu'
import { GroupBuilder } from '../builders/GroupBuilder'
import { bezierPosition, bezierRotation } from './bezier'

function useControlPointArray(builder: GroupBuilder<any, any>) {
  // @ts-ignore
  const renderer = useThree(({ gl }) => gl as WebGPURenderer)

  const curvePositionArray = instancedArray(
    builder.settings.maxPoints * builder.settings.maxCurves,
    'vec4',
  )
  const curveColorArray = instancedArray(
    builder.settings.maxPoints * builder.settings.maxCurves,
    'vec4',
  )
  const loadPositions = uniformArray(
    range(builder.settings.maxPoints * builder.settings.maxCurves).map(
      (x) => new Vector4(),
    ),
    'vec4',
  )
  const loadColors = uniformArray(
    range(builder.settings.maxPoints * builder.settings.maxCurves).map(
      (x) => new Vector4(),
    ),
    'vec4',
  )
  const controlPointCounts = uniformArray(
    builder.curves.map((x) => x.length),
    'int',
  )

  const pointI = instanceIndex.modInt(builder.settings.maxPoints)
  const curveI = instanceIndex.div(builder.settings.maxPoints)

  const advanceControlPoints = Fn(() => {
    const info = {
      progress: curveI
        .toFloat()
        .add(pointI.toFloat().div(controlPointCounts.element(curveI).sub(1))),
      builder,
    }
    const index = curveI.mul(builder.settings.maxPoints).add(pointI)
    const thisPosition = loadPositions.element(index)
    curvePositionArray.element(index).assign(
      builder.settings.curvePosition(thisPosition, {
        ...info,
        lastFrame: curvePositionArray.element(index),
      }),
    )
    const thisColor = loadColors.element(index)
    curveColorArray.element(index).assign(
      builder.settings.curveColor(thisColor, {
        ...info,
        lastFrame: curveColorArray.element(index),
      }),
    )
  })().compute(builder.settings.maxPoints * builder.settings.maxCurves)

  const nextTime = useRef<number>(
    (typeof builder.settings.renderStart === 'function'
      ? builder.settings.renderStart()
      : builder.settings.renderStart) / 1000,
  )

  useFrame((state) => {
    if (state.clock.elapsedTime > nextTime.current) {
      if (builder.settings.renderInit) {
        const r = builder.settings.renderInit
        nextTime.current =
          typeof r === 'boolean'
            ? state.clock.elapsedTime + 1 / 60
            : typeof r === 'number'
              ? state.clock.elapsedTime + r / 1000
              : state.clock.elapsedTime + r(nextTime.current * 1000) / 1000
        reInitialize(state.clock.elapsedTime)
      }
    }
    update()
  })

  useEffect(() => {
    reInitialize(nextTime.current)
    return () => {
      curvePositionArray.dispose()
      curveColorArray.dispose()
    }
  }, [builder])

  const hooks: { onUpdate?: () => void; onInit?: () => void } = {}
  const update = () => {
    if (hooks.onUpdate) {
      hooks.onUpdate()
    }
    renderer.compute(advanceControlPoints)
  }

  const reInitialize = (seconds: number) => {
    if (builder.settings.renderClear) builder.clear()
    builder.reInitialize(seconds)
    reload()
    if (hooks.onInit) {
      hooks.onInit()
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
            point.thickness,
          )
          loadColorsArray[curveIndex + j].set(
            point.color[0],
            point.color[1],
            point.color[2],
            point.alpha,
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

  return {
    curvePositionArray,
    curveColorArray,
    controlPointCounts,
    hooks,
  }
}

export function usePoints(builder: GroupBuilder<any, any>) {
  const { curvePositionArray, curveColorArray, hooks } =
    useControlPointArray(builder)
  return { curvePositionArray, curveColorArray, hooks }
}

export function useCurve(builder: GroupBuilder<any, any>) {
  const size = useThree((state) => state.gl.getDrawingBufferSize(new Vector2()))

  const { curvePositionArray, curveColorArray, controlPointCounts, hooks } =
    useControlPointArray(builder)

  const instancesPerCurve = Math.max(
    1,
    Math.floor(
      builder.settings.spacingType === 'pixel'
        ? (builder.settings.maxLength * size.width) / builder.settings.spacing
        : builder.settings.spacingType === 'width'
          ? (builder.settings.maxLength * size.width) /
            (builder.settings.spacing * size.width)
          : builder.settings.spacingType === 'count'
            ? builder.settings.spacing
            : 0,
    ),
  )

  const getBezier = useCallback(
    (
      progress: ReturnType<typeof float>,
      position: ReturnType<typeof vec2>,
      extra?: {
        rotation?: ReturnType<typeof float>
        thickness?: ReturnType<typeof float>
        color?:
          | ReturnType<typeof varying>
          | ReturnType<ReturnType<typeof float>['toVar']>
        progress?: ReturnType<typeof varying>
      },
    ) => {
      const progressVar = progress.toVar()
      If(progressVar.equal(-1), () => {
        extra?.color?.assign(vec4(0, 0, 0, 0))
      }).Else(() => {
        progressVar.assign(
          floor(progress).add(
            builder.settings.pointProgress(progress.fract(), {
              builder,
              progress,
            }),
          ),
        )
        extra?.progress?.assign(progressVar)
        const controlPointsCount = controlPointCounts.element(int(progressVar))
        const subdivisions = select(
          controlPointsCount.equal(2),
          1,
          builder.settings.adjustEnds === 'loop'
            ? controlPointsCount
            : controlPointsCount.sub(2),
        ).toVar()

        //4 points: 4-2 = 2 0->1 1->2 (if it goes to the last value then it starts interpolating another curve)
        const t = vec2(
          progressVar.fract().mul(0.999).mul(subdivisions),
          floor(progressVar),
        )
        const curveIndex = floor(progressVar).mul(builder.settings.maxPoints)
        const pointIndex = progressVar.fract().mul(0.999).mul(subdivisions)
        const index = curveIndex.add(pointIndex).toVar()

        If(controlPointsCount.equal(2), () => {
          const p0 = curvePositionArray.element(index)
          const p1 = curvePositionArray.element(index.add(1))
          const progressPoint = mix(p0, p1, t.x)

          position.assign(progressPoint.xy)
          if (extra) {
            const index = t.y.mul(builder.settings.maxPoints).add(t.x)
            extra.color?.assign(curveColorArray.element(index))
            extra.thickness?.assign(progressPoint.w)
            const rotationCalc = p1.xy.sub(p0.xy).toVar()
            extra.rotation?.assign(atan(rotationCalc.y, rotationCalc.x))
          }
        }).Else(() => {
          const p0 = curvePositionArray.element(index).toVar()
          const p1 = curvePositionArray
            .element(curveIndex.add(pointIndex.add(1).mod(controlPointsCount)))
            .toVar()
          const p2 = curvePositionArray
            .element(curveIndex.add(pointIndex.add(2).mod(controlPointsCount)))
            .toVar()

          if (builder.settings.adjustEnds === true) {
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
            strength,
          })

          position.assign(pos)
          const c0 = curveColorArray.element(index)
          const c1 = curveColorArray.element(index.add(1))
          if (extra) {
            extra.color?.assign(mix(c0, c1, t.x.fract()))
            extra.thickness?.assign(
              bezierPosition({
                t: t.x.fract(),
                p0: vec2(0, p0.w),
                p1: vec2(0.5, p1.w),
                p2: vec2(1, p2.w),
                strength,
              }).y,
            )
            extra.rotation?.assign(
              bezierRotation({
                t: t.x.fract(),
                p0: p0.xy,
                p1: p1.xy,
                p2: p2.xy,
                strength,
              }),
            )
          }
        })
      })
      if (extra) {
        extra.thickness?.assign(
          builder.settings
            .pointThickness(extra.thickness, { progress: progressVar, builder })
            .div(screenSize.x),
        )
        extra.rotation?.assign(
          builder.settings.pointRotate(extra.rotation!, {
            progress: extra.progress!,
            builder,
          }),
        )
      }
    },
    [builder],
  )

  return {
    getBezier,
    instancesPerCurve,
    hooks,
  }
}

const controlPointArrayThree = (
  builder: GroupBuilder<any, any>,
  state: { gl: WebGPURenderer },
) => {
  const renderer = state.gl

  const curvePositionArray = instancedArray(
    builder.settings.maxPoints * builder.settings.maxCurves,
    'vec4',
  )
  const curveColorArray = instancedArray(
    builder.settings.maxPoints * builder.settings.maxCurves,
    'vec4',
  )
  const loadPositions = uniformArray(
    range(builder.settings.maxPoints * builder.settings.maxCurves).map(
      (x) => new Vector4(),
    ),
    'vec4',
  )
  const loadColors = uniformArray(
    range(builder.settings.maxPoints * builder.settings.maxCurves).map(
      (x) => new Vector4(),
    ),
    'vec4',
  )
  const controlPointCounts = uniformArray(
    builder.curves.map((x) => x.length),
    'int',
  )

  const pointI = instanceIndex.modInt(builder.settings.maxPoints)
  const curveI = instanceIndex.div(builder.settings.maxPoints)

  const advanceControlPoints = Fn(() => {
    const info = {
      progress: curveI
        .toFloat()
        .add(pointI.toFloat().div(controlPointCounts.element(curveI).sub(1))),
      builder,
    }
    const index = curveI.mul(builder.settings.maxPoints).add(pointI)
    const thisPosition = loadPositions.element(index)
    curvePositionArray.element(index).assign(
      builder.settings.curvePosition(thisPosition, {
        ...info,
        lastFrame: curvePositionArray.element(index),
      }),
    )
    const thisColor = loadColors.element(index)
    curveColorArray.element(index).assign(
      builder.settings.curveColor(thisColor, {
        ...info,
        lastFrame: curveColorArray.element(index),
      }),
    )
  })().compute(builder.settings.maxPoints * builder.settings.maxCurves)

  const nextTime = {
    current:
      (typeof builder.settings.renderStart === 'function'
        ? builder.settings.renderStart()
        : builder.settings.renderStart) / 1000,
  }

  let start = performance.now()
  const frame = () => {
    const time = performance.now() - start
    if (time > nextTime.current) {
      if (builder.settings.renderInit) {
        const r = builder.settings.renderInit
        nextTime.current =
          typeof r === 'boolean'
            ? time + 1 / 60
            : typeof r === 'number'
              ? time + r / 1000
              : time + r(nextTime.current * 1000) / 1000
        reInitialize(time)
      }
    }
    update()
  }
  window.setInterval(frame, 17)

  builder.reInitialize(nextTime.current)

  const dispose = () => {
    curvePositionArray.dispose()
    curveColorArray.dispose()
  }

  const hooks: { onUpdate?: () => void; onInit?: () => void } = {}
  const update = () => {
    if (hooks.onUpdate) {
      hooks.onUpdate()
    }
    renderer.compute(advanceControlPoints)
  }

  const reInitialize = (seconds: number) => {
    if (builder.settings.renderClear) builder.clear()
    builder.reInitialize(seconds)
    reload()
    if (hooks.onInit) {
      hooks.onInit()
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
            point.thickness,
          )
          loadColorsArray[curveIndex + j].set(
            point.color[0],
            point.color[1],
            point.color[2],
            point.alpha,
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

  return {
    curvePositionArray,
    curveColorArray,
    controlPointCounts,
    hooks,
  }
}

export const curveThree = (
  builder: GroupBuilder<any, any>,
  state: { gl: WebGPURenderer },
) => {
  const size = state.gl.getDrawingBufferSize(new Vector2())

  const { curvePositionArray, curveColorArray, controlPointCounts, hooks } =
    controlPointArrayThree(builder, state)

  const instancesPerCurve = Math.max(
    1,
    Math.floor(
      builder.settings.spacingType === 'pixel'
        ? (builder.settings.maxLength * size.width) / builder.settings.spacing
        : builder.settings.spacingType === 'width'
          ? (builder.settings.maxLength * size.width) /
            (builder.settings.spacing * size.width)
          : builder.settings.spacingType === 'count'
            ? builder.settings.spacing
            : 0,
    ),
  )

  const getBezier = (
    progress: ReturnType<typeof float>,
    position: ReturnType<typeof vec2>,
    extra?: {
      rotation?: ReturnType<typeof float>
      thickness?: ReturnType<typeof float>
      color?:
        | ReturnType<typeof varying>
        | ReturnType<ReturnType<typeof float>['toVar']>
      progress?: ReturnType<typeof varying>
    },
  ) => {
    const progressVar = progress.toVar()
    If(progressVar.equal(-1), () => {
      extra?.color?.assign(vec4(0, 0, 0, 0))
    }).Else(() => {
      progressVar.assign(
        floor(progress).add(
          builder.settings.pointProgress(progress.fract(), {
            builder,
            progress,
          }),
        ),
      )
      extra?.progress?.assign(progressVar)
      const controlPointsCount = controlPointCounts.element(int(progressVar))
      const subdivisions = select(
        controlPointsCount.equal(2),
        1,
        builder.settings.adjustEnds === 'loop'
          ? controlPointsCount
          : controlPointsCount.sub(2),
      ).toVar()

      //4 points: 4-2 = 2 0->1 1->2 (if it goes to the last value then it starts interpolating another curve)
      const t = vec2(
        progressVar.fract().mul(0.999).mul(subdivisions),
        floor(progressVar),
      )
      const curveIndex = floor(progressVar).mul(builder.settings.maxPoints)
      const pointIndex = progressVar.fract().mul(0.999).mul(subdivisions)
      const index = curveIndex.add(pointIndex).toVar()

      If(controlPointsCount.equal(2), () => {
        const p0 = curvePositionArray.element(index)
        const p1 = curvePositionArray.element(index.add(1))
        const progressPoint = mix(p0, p1, t.x)

        position.assign(progressPoint.xy)
        if (extra) {
          const index = t.y.mul(builder.settings.maxPoints).add(t.x)
          extra.color?.assign(curveColorArray.element(index))
          extra.thickness?.assign(progressPoint.w)
          const rotationCalc = p1.xy.sub(p0.xy).toVar()
          extra.rotation?.assign(atan(rotationCalc.y, rotationCalc.x))
        }
      }).Else(() => {
        const p0 = curvePositionArray.element(index).toVar()
        const p1 = curvePositionArray
          .element(curveIndex.add(pointIndex.add(1).mod(controlPointsCount)))
          .toVar()
        const p2 = curvePositionArray
          .element(curveIndex.add(pointIndex.add(2).mod(controlPointsCount)))
          .toVar()

        if (builder.settings.adjustEnds === true) {
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
          strength,
        })

        position.assign(pos)
        const c0 = curveColorArray.element(index)
        const c1 = curveColorArray.element(index.add(1))
        if (extra) {
          extra.color?.assign(mix(c0, c1, t.x.fract()))
          extra.thickness?.assign(
            bezierPosition({
              t: t.x.fract(),
              p0: vec2(0, p0.w),
              p1: vec2(0.5, p1.w),
              p2: vec2(1, p2.w),
              strength,
            }).y,
          )
          extra.rotation?.assign(
            bezierRotation({
              t: t.x.fract(),
              p0: p0.xy,
              p1: p1.xy,
              p2: p2.xy,
              strength,
            }),
          )
        }
      })
    })
    if (extra) {
      extra.thickness?.assign(
        builder.settings
          .pointThickness(extra.thickness, { progress: progressVar, builder })
          .div(screenSize.x),
      )
      extra.rotation?.assign(
        builder.settings.pointRotate(extra.rotation!, {
          progress: extra.progress!,
          builder,
        }),
      )
    }
  }

  return {
    getBezier,
    instancesPerCurve,
    hooks,
  }
}
