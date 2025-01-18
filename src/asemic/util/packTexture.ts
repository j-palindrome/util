import { useFrame, useThree } from '@react-three/fiber'
import { range } from 'lodash'
import { useEffect, useMemo, useRef } from 'react'
import {
  ClampToEdgeWrapping,
  DataTexture,
  FloatType,
  LinearFilter,
  MagnificationTextureFilter,
  NearestFilter,
  PixelFormat,
  RGBAFormat,
  Vector2
} from 'three'
import { Fn } from 'three/src/nodes/TSL.js'
import {
  atan,
  float,
  If,
  instanceIndex,
  ivec2,
  mix,
  PI2,
  screenSize,
  select,
  texture,
  textureLoad,
  textureStore,
  uniformArray,
  vec2,
  vec4
} from 'three/tsl'
import { StorageTexture, WebGPURenderer } from 'three/webgpu'
import { GroupBuilder } from '../Builder'
import { textureLoadFix } from '../../tsl/utility'
import { bezierPoint } from '../../tsl/curves'

export function useControlPoints(builder: GroupBuilder<any>) {
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
    const curvePositionLoadU = textureLoad(positionTex, vec2(pointI, curveI))
    const curveColorLoadU = textureLoad(colorTex, vec2(pointI, curveI))
    const lastCurvePositionLoadU = textureLoad(
      positionTex,
      vec2(pointI, curveI)
    )
    const lastCurveColorLoadU = textureLoad(colorTex, vec2(pointI, curveI))
    const aspectRatio = screenSize.div(screenSize.x).toVar('screenSize')

    const advanceControlPoints = Fn(() => {
      const textureVector = vec2(
        pointI.toFloat().div(controlPointCounts.element(curveI)),
        curveI.toFloat().div(builder.settings.maxCurves)
      )
      const info = {
        pointUV: textureVector,
        aspectRatio: aspectRatio.y,
        settings: builder.settings
      }
      const point = builder.settings.curveVert(vec4(curvePositionLoadU), {
        ...info,
        lastPosition: vec4(lastCurvePositionLoadU)
      })
      textureStore(curvePositionTex, vec2(pointI, curveI), point).toWriteOnly()

      const color = builder.settings.curveFrag(vec4(curveColorLoadU), {
        ...info,
        lastColor: vec4(lastCurveColorLoadU)
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

    return {
      advanceControlPoints,
      curvePositionLoadU,
      curveColorLoadU,
      lastCurvePositionLoadU,
      lastCurveColorLoadU,
      curvePositionTex,
      curveColorTex,
      controlPointCounts
    }
  }, [builder])

  let updating: number

  // @ts-ignore
  const gl = useThree(({ gl }) => gl as WebGPURenderer)
  const resolution = new Vector2()
  gl.getDrawingBufferSize(resolution)

  const reInitialize = () => {
    builder.reInitialize(resolution)
    for (let i = 0; i < builder.settings.maxCurves; i++) {
      data.controlPointCounts.array[i] = builder.curves[i].length
    }

    data.lastCurvePositionLoadU.value = data.curvePositionLoadU.value
    data.lastCurveColorLoadU.value = data.curveColorLoadU.value

    const loadPositions = data.curvePositionLoadU.value.source.data
      .data as Float32Array
    const loadColors = data.curveColorLoadU.value.source.data
      .data as Float32Array
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

    data.curvePositionLoadU.value.needsUpdate = true
    data.curveColorLoadU.value.needsUpdate = true

    gl.computeAsync(data.advanceControlPoints)
  }

  const nextTime = useRef<number>(builder.settings.start / 1000)

  useFrame(state => {
    if (state.clock.elapsedTime > nextTime.current) {
      if (builder.settings.recalculate) {
        const r = builder.settings.recalculate
        nextTime.current =
          typeof r === 'boolean'
            ? nextTime.current + 1 / 60
            : typeof r === 'number'
              ? nextTime.current + r / 1000
              : nextTime.current + r(nextTime.current * 1000) / 1000
        reInitialize()
      }
    }
  })

  const update = () => {
    gl.computeAsync(data.advanceControlPoints)
    updating = requestAnimationFrame(update)
  }

  reInitialize()
  useEffect(() => {
    if (builder.settings.update) {
      updating = requestAnimationFrame(update)
    }
    return () => {
      cancelAnimationFrame(updating)
    }
  }, [builder])

  const { curvePositionTex, curveColorTex, controlPointCounts } = data
  const curvePositionTexU = texture(curvePositionTex)
  const verticesPerCurve = Math.floor(
    (builder.settings.maxLength * resolution.x) / (builder.settings.spacing * 5)
  )

  const aspectRatio = screenSize.div(screenSize.x).toVar('screenSize')

  const getBezier = (index, position, rotation, thickness, color) => {
    const curveIndex = index.div(2).div(verticesPerCurve).toVar('curveIndex')
    const controlPointsCount = controlPointCounts.element(curveIndex)
    const subdivisions = select(
      controlPointsCount.equal(2),
      1,
      controlPointsCount.sub(2)
    ).toVar('subdivisions')
    const t = vec2(
      index
        .div(2)
        .toFloat()
        .mod(verticesPerCurve)
        .div(verticesPerCurve - 0.99)
        .mul(subdivisions),
      curveIndex
    )

    If(t.x.equal(-1), () => {
      color.assign(vec4(0, 0, 0, 0))
    }).Else(() => {
      If(controlPointsCount.equal(2), () => {
        const p0 = textureLoadFix(curvePositionTexU, ivec2(0, t.y)).xy
        const p1 = textureLoadFix(curvePositionTexU, ivec2(1, t.y)).xy
        const pointUV = vec2(t.x, t.y.div(builder.settings.maxCurves))
        const info = {
          pointUV,
          aspectRatio: aspectRatio.y,
          settings: builder.settings
        }
        const progressPoint = mix(p0, p1, t.x)

        const textureVector = vec2(
          t.x.add(0.5).div(builder.settings.maxPoints),
          t.y.add(0.5).div(builder.settings.maxCurves)
        )
        color.assign(
          builder.settings.pointFrag(
            vec4(texture(curveColorTex, textureVector)),
            info
          )
        )
        thickness.assign(texture(curvePositionTex, textureVector).w)
        position.assign(progressPoint)

        rotation.assign(atan(p1.sub(p0).y, p1.sub(p0).x).add(PI2.mul(0.25)))
      }).Else(() => {
        const pointProgress = t.x
        const p2 = textureLoadFix(
          curvePositionTexU,
          ivec2(pointProgress.add(2), t.y)
        ).xy.toVar('p2')
        const p0 = textureLoadFix(
          curvePositionTexU,
          ivec2(pointProgress, t.y)
        ).xy.toVar('p0')
        const p1 = textureLoadFix(
          curvePositionTexU,
          ivec2(pointProgress.add(1), t.y)
        ).xy.toVar('p1')

        If(pointProgress.greaterThan(float(1)), () => {
          p0.assign(mix(p0, p1, float(0.5)))
        })
        If(pointProgress.lessThan(float(controlPointsCount).sub(3)), () => {
          p2.assign(mix(p1, p2, 0.5))
        })
        const strength = textureLoadFix(
          curvePositionTexU,
          ivec2(pointProgress.add(1), t.y)
        ).z.toVar('strength')
        const thisPoint = bezierPoint({
          t: pointProgress.fract(),
          p0,
          p1,
          p2,
          strength
        })
        const tt = vec2(
          // 2 points: 0.5-1.5
          pointProgress
            .div(controlPointsCount.sub(2))
            .mul(controlPointsCount.sub(1))
            .add(0.5)
            .div(builder.settings.maxPoints),
          t.y.add(0.5).div(builder.settings.maxCurves)
        )
        const pointUV = vec2(
          pointProgress.div(controlPointsCount.sub(2)),
          t.y.div(builder.settings.maxCurves)
        )
        const info = {
          pointUV,
          aspectRatio: aspectRatio.y,
          settings: builder.settings
        }
        color.assign(
          builder.settings.pointFrag(vec4(texture(curveColorTex, tt)), info)
        )
        thickness.assign(texture(curvePositionTex, tt).w)
        position.assign(builder.settings.pointVert(thisPoint.position, info))
        rotation.assign(thisPoint.rotation)
      })
    })
    thickness.divAssign(screenSize.x)
  }

  useEffect(() => {
    return () => {
      curvePositionTex.dispose()
      curveColorTex.dispose()
    }
  }, [])

  return {
    getBezier
  }
}
