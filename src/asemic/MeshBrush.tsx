import { extend, Object3DNode, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Vector2 } from 'three'
import {
  atan,
  float,
  Fn,
  If,
  instanceIndex,
  ivec2,
  mix,
  mrt,
  PI2,
  rotateUV,
  screenSize,
  select,
  texture,
  textureLoad,
  textureStore,
  uniform,
  uniformArray,
  varying,
  varyingProperty,
  vec2,
  vec4,
  vertexIndex
} from 'three/tsl'
import {
  MeshBasicNodeMaterial,
  StorageInstancedBufferAttribute,
  StorageTexture,
  WebGPURenderer
} from 'three/webgpu'
import { bezierPoint } from '../tsl/curves'
import { textureLoadFix } from '../tsl/utility'
import { GroupBuilder } from './Builder'
import { createTexture, packToTexture } from './util/packTexture'

type VectorList = [number, number]
type Vector3List = [number, number, number]
export type Jitter = {
  size?: VectorList
  position?: VectorList
  hsl?: Vector3List
  a?: number
  rotation?: number
}

extend({ StorageInstancedBufferAttribute })
declare module '@react-three/fiber' {
  interface ThreeElements {
    storageInstancedBufferAttribute: Object3DNode<
      StorageInstancedBufferAttribute,
      typeof StorageInstancedBufferAttribute
    >
  }
}

export default function MeshBrush({
  builder
}: {
  builder: GroupBuilder<'line'>
}) {
  const [rendering, setRendering] = useState(true)
  // @ts-ignore
  const gl = useThree(({ gl }) => gl as WebGPURenderer)
  const resolution = new Vector2()
  const width = gl.getDrawingBufferSize(resolution).x
  builder.reInitialize(resolution)
  const verticesPerCurve = Math.floor(
    (builder.settings.maxLength * width) / (builder.settings.spacing * 5)
  )

  const {
    mesh,
    material,
    geometry,
    curvePositionTex,
    curveColorTex,
    controlPointCounts
  } = useMemo(() => {
    const type: string = 'line'
    if (type === 'mesh') {
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3))
      const indexGuide = [0, 1, 2, 1, 2, 3]

      let currentIndex = 0
      const indexes: number[] = []
      for (let i = 0; i < builder.settings.maxCurves; i++) {
        for (let i = 0; i < verticesPerCurve - 1; i++) {
          indexes.push(...indexGuide.map(x => x + currentIndex))
          currentIndex += 2
        }
        currentIndex += 2
      }

      geometry.setIndex(indexes)

      const material = new MeshBasicNodeMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
        side: THREE.DoubleSide,
        color: 'white'
      })

      material.mrtNode = builder.settings.renderTargets

      const mesh = new THREE.Mesh(geometry, material)

      const curvePositionTex = new StorageTexture(
        builder.settings.maxPoints,
        builder.settings.maxCurves
      )
      curvePositionTex.type = THREE.FloatType
      const curveColorTex = new StorageTexture(
        builder.settings.maxPoints,
        builder.settings.maxCurves
      )
      const controlPointCounts = uniformArray(
        builder.curves.map(x => x.length),
        'int'
      )
      return {
        mesh,
        material,
        geometry,
        curvePositionTex,
        curveColorTex,
        controlPointCounts
      }
    } else {
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3))
      const indexGuide = [0, 1, 2, 1, 2, 3]

      let currentIndex = 0
      const indexes: number[] = []
      for (let i = 0; i < builder.settings.maxCurves; i++) {
        for (let i = 0; i < verticesPerCurve - 1; i++) {
          indexes.push(...indexGuide.map(x => x + currentIndex))
          currentIndex += 2
        }
        currentIndex += 2
      }

      geometry.setIndex(indexes)

      const material = new MeshBasicNodeMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
        side: THREE.DoubleSide,
        color: 'white'
      })

      material.mrtNode = builder.settings.renderTargets

      const mesh = new THREE.Mesh(geometry, material)

      const curvePositionTex = new StorageTexture(
        builder.settings.maxPoints,
        builder.settings.maxCurves
      )
      curvePositionTex.type = THREE.FloatType
      const curveColorTex = new StorageTexture(
        builder.settings.maxPoints,
        builder.settings.maxCurves
      )
      const controlPointCounts = uniformArray(
        builder.curves.map(x => x.length),
        'int'
      )
      return {
        mesh,
        material,
        geometry,
        curvePositionTex,
        curveColorTex,
        controlPointCounts
      }
    }
  }, [builder])

  const {
    advanceControlPoints,
    curvePositionLoadU,
    curveColorLoadU,
    lastCurvePositionLoadU,
    lastCurveColorLoadU
  } = useMemo(() => {
    const { positions, colors } = packToTexture(
      new Vector2(builder.settings.maxPoints, builder.settings.maxCurves),
      builder.curves
    )
    const positionTex = createTexture(
      positions,
      builder.settings.maxPoints,
      builder.settings.maxCurves
    )
    const colorTex = createTexture(
      colors,
      builder.settings.maxPoints,
      builder.settings.maxCurves
    )

    const dimensionsU = uniform(
      new Vector2(builder.settings.maxPoints, builder.settings.maxCurves),
      'vec2'
    )
    const aspectRatio = screenSize.div(screenSize.x).toVar('screenSize')

    const pointI = instanceIndex.modInt(builder.settings.maxPoints)
    const curveI = instanceIndex.div(builder.settings.maxPoints)
    const curvePositionLoadU = textureLoad(positionTex, vec2(pointI, curveI))
    const curveColorLoadU = textureLoad(colorTex, vec2(pointI, curveI))
    const lastCurvePositionLoadU = textureLoad(
      positionTex,
      vec2(pointI, curveI)
    )
    const lastCurveColorLoadU = textureLoad(colorTex, vec2(pointI, curveI))

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

    // const getBezier = (pointProgress, curveProgress, controlPointsCount) => {
    //   const p2 = textureLoadFix(
    //     curvePositionTexU,
    //     ivec2(pointProgress.add(2), curveProgress)
    //   ).xy.toVar('p2')
    //   const p0 = textureLoadFix(
    //     curvePositionTexU,
    //     ivec2(pointProgress, curveProgress)
    //   ).xy.toVar('p0')
    //   const p1 = textureLoadFix(
    //     curvePositionTexU,
    //     ivec2(pointProgress.add(1), curveProgress)
    //   ).xy.toVar('p1')

    //   If(pointProgress.greaterThan(float(1)), () => {
    //     p0.assign(mix(p0, p1, float(0.5)))
    //   })
    //   If(pointProgress.lessThan(float(controlPointsCount).sub(3)), () => {
    //     p2.assign(mix(p1, p2, 0.5))
    //   })
    //   const strength = textureLoadFix(
    //     curvePositionTexU,
    //     ivec2(pointProgress.add(1), curveProgress)
    //   ).z.toVar('strength')
    //   return bezierPoint({
    //     t: pointProgress.fract(),
    //     p0,
    //     p1,
    //     p2,
    //     strength
    //   })
    // }

    const rotation = float(0).toVar('rotation')
    const thickness = float(0).toVar('thickness')
    const curvePositionTexU = texture(curvePositionTex)

    const main = Fn(() => {
      const curveIndex = vertexIndex
        .div(2)
        .div(verticesPerCurve)
        .toVar('curveIndex')
      const controlPointsCount = controlPointCounts.element(curveIndex)
      const subdivisions = select(
        controlPointsCount.equal(2),
        1,
        controlPointsCount.sub(2)
      ).toVar('subdivisions')
      const t = vec2(
        vertexIndex
          .div(2)
          .toFloat()
          .mod(verticesPerCurve)
          .div(verticesPerCurve - 0.99)
          .mul(subdivisions),
        curveIndex
      )

      const position = vec2().toVar('thisPosition')

      If(t.x.equal(-1), () => {
        varyingProperty('vec4', 'colorV').assign(vec4(0, 0, 0, 0))
      }).Else(() => {
        If(controlPointsCount.equal(2), () => {
          const p0 = textureLoadFix(curvePositionTexU, ivec2(0, t.y)).xy
          const p1 = textureLoadFix(curvePositionTexU, ivec2(1, t.y)).xy
          If(p1.x.equal(-1111), () => {
            varyingProperty('vec4', 'colorV').assign(vec4(0, 0, 0, 0))
          }).Else(() => {
            const pointUV = vec2(t.x, t.y.div(dimensionsU.y))
            const info = {
              pointUV,
              aspectRatio: aspectRatio.y,
              settings: builder.settings
            }
            const progressPoint = mix(p0, p1, t.x)
            // const rotate = lineTangent(p0, p1).toVar('rotate')
            const textureVector = vec2(
              t.x.add(0.5).div(dimensionsU.x),
              t.y.add(0.5).div(dimensionsU.y)
            )
            varyingProperty('vec4', 'colorV').assign(
              builder.settings.pointFrag(
                vec4(texture(curveColorTex, textureVector)),
                info
              )
            )
            thickness.assign(texture(curvePositionTex, textureVector).w)
            position.assign(progressPoint)

            rotation.assign(atan(p1.sub(p0).y, p1.sub(p0).x).add(PI2.mul(0.25)))
          })
        }).Else(() => {
          const pointProgress = t.x
          const p2 = textureLoadFix(
            curvePositionTexU,
            ivec2(pointProgress.add(2), t.y)
          ).xy.toVar('p2')

          If(p2.x.equal(-1111), () => {
            varyingProperty('vec4', 'colorV').assign(vec4(0, 0, 0, 0))
          }).Else(() => {
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
                .div(dimensionsU.x),
              t.y.add(0.5).div(dimensionsU.y)
            )
            const pointUV = vec2(
              pointProgress.div(controlPointsCount.sub(2)),
              t.y.div(dimensionsU.y)
            )
            const info = {
              pointUV,
              aspectRatio: aspectRatio.y,
              settings: builder.settings
            }
            varyingProperty('vec4', 'colorV').assign(
              builder.settings.pointFrag(vec4(texture(curveColorTex, tt)), info)
            )
            thickness.assign(texture(curvePositionTex, tt).w)
            position.assign(
              builder.settings.pointVert(thisPoint.position, info)
            )
            rotation.assign(thisPoint.rotation)
          })
        })
      })
      thickness.divAssign(screenSize.x)
      position.addAssign(
        rotateUV(
          vec2(
            thickness.mul(select(vertexIndex.modInt(2).equal(0), -0.5, 0.5)),
            0
          ),
          rotation,
          vec2(0, 0)
        )
      )

      return vec4(position, 0, 1)
    })

    material.positionNode = main()

    const colorV = varying(vec4(), 'colorV')
    material.colorNode = colorV
    material.needsUpdate = true

    return {
      advanceControlPoints,
      curvePositionLoadU,
      curveColorLoadU,
      lastCurvePositionLoadU,
      lastCurveColorLoadU
    }
  }, [builder])

  let updating: number

  const reInitialize = () => {
    builder.reInitialize(resolution)
    for (let i = 0; i < builder.settings.maxCurves; i++) {
      controlPointCounts.array[i] = builder.curves[i].length
    }

    lastCurvePositionLoadU.value = curvePositionLoadU.value
    lastCurveColorLoadU.value = curveColorLoadU.value
    const newData = packToTexture(
      new Vector2(builder.settings.maxPoints, builder.settings.maxCurves),
      builder.curves
    )

    const loadPositions = curvePositionLoadU.value.source.data
      .data as Float32Array
    loadPositions.set(newData.positions)
    const loadColors = curveColorLoadU.value.source.data.data as Float32Array
    loadColors.set(newData.colors)
    curvePositionLoadU.value.needsUpdate = true
    curveColorLoadU.value.needsUpdate = true

    gl.computeAsync(advanceControlPoints)
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
    gl.computeAsync(advanceControlPoints)
    material.needsUpdate = true
    updating = requestAnimationFrame(update)
  }

  useEffect(() => {
    console.log('reinit')

    reInitialize()
    if (rendering && builder.settings.update) {
      updating = requestAnimationFrame(update)
    }
    return () => {
      cancelAnimationFrame(updating)
    }
  }, [builder])

  const scene = useThree(({ scene }) => scene)
  useEffect(() => {
    if (rendering) {
      scene.add(mesh)
    }
    return () => {
      scene.remove(mesh)
      // mesh.dispose()
      material.dispose()
      geometry.dispose()
      curvePositionTex.dispose()
      curveColorTex.dispose()
    }
  }, [builder])

  return <></>
}
