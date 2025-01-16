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
  const firstData = useMemo(() => builder.reInitialize(resolution), [builder])

  const verticesPerCurve = Math.floor(
    (firstData.settings.maxLength * width) / (firstData.settings.spacing * 5)
  )

  const {
    mesh,
    material,
    geometry,
    curvePositionTex,
    curveColorTex,
    controlPointCounts
  } = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3))
    const indexGuide = [0, 1, 2, 1, 2, 3]

    let currentIndex = 0
    const indexes: number[] = []
    for (let i = 0; i < firstData.dimensions.y; i++) {
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

    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(...firstData.transform.translate.toArray(), 0)
    mesh.scale.set(...firstData.transform.scale.toArray(), 0)
    mesh.rotation.set(0, 0, firstData.transform.rotate)

    const curvePositionTex = new StorageTexture(
      firstData.dimensions.x,
      firstData.dimensions.y
    )
    curvePositionTex.type = THREE.FloatType
    const curveColorTex = new StorageTexture(
      firstData.dimensions.x,
      firstData.dimensions.y
    )
    const controlPointCounts = uniformArray(
      firstData.positionArray.map(x => x.length),
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
  }, [builder])

  const {
    advanceControlPoints,
    curvePositionLoadU,
    curveColorLoadU,
    lastCurvePositionLoadU,
    lastCurveColorLoadU
  } = useMemo(() => {
    const pixel = 1 / width

    const dimensionsU = uniform(firstData.dimensions, 'vec2')
    const aspectRatio = screenSize.div(screenSize.x).toVar('screenSize')

    const pointI = instanceIndex.modInt(firstData.dimensions.x)
    const curveI = instanceIndex.div(firstData.dimensions.x)
    const curvePositionLoadU = textureLoad(
      firstData.positionTex,
      vec2(pointI, curveI)
    )
    const curveColorLoadU = textureLoad(
      firstData.colorTex,
      vec2(pointI, curveI)
    )
    const lastCurvePositionLoadU = textureLoad(
      firstData.positionTex,
      vec2(pointI, curveI)
    )
    const lastCurveColorLoadU = textureLoad(
      firstData.colorTex,
      vec2(pointI, curveI)
    )

    const advanceControlPoints = Fn(() => {
      const textureVector = vec2(
        pointI.toFloat().div(controlPointCounts.element(curveI)),
        curveI.toFloat().div(firstData.dimensions.y)
      )
      const info = {
        pointUV: textureVector,
        aspectRatio: aspectRatio.y,
        settings: firstData.settings
      }
      const point = firstData.settings.curveVert(vec4(curvePositionLoadU), {
        ...info,
        lastPosition: vec4(lastCurvePositionLoadU)
      })
      textureStore(curvePositionTex, vec2(pointI, curveI), point).toWriteOnly()

      const color = firstData.settings.curveFrag(vec4(curveColorLoadU), {
        ...info,
        lastColor: vec4(lastCurveColorLoadU)
      })
      return textureStore(
        curveColorTex,
        vec2(pointI, curveI),
        color
      ).toWriteOnly()
    })().compute(
      firstData.dimensions.x * firstData.dimensions.y,
      undefined as any
    )

    const sampleCurveLengthsTex = new StorageTexture(
      100,
      firstData.dimensions.y
    )
    sampleCurveLengthsTex.type = THREE.FloatType

    const getBezier = (pointProgress, curveProgress, controlPointsCount) => {
      const p2 = textureLoadFix(
        curvePositionTexU,
        ivec2(pointProgress.add(2), curveProgress)
      ).xy.toVar('p2')
      const p0 = textureLoadFix(
        curvePositionTexU,
        ivec2(pointProgress, curveProgress)
      ).xy.toVar('p0')
      const p1 = textureLoadFix(
        curvePositionTexU,
        ivec2(pointProgress.add(1), curveProgress)
      ).xy.toVar('p1')

      If(pointProgress.greaterThan(float(1)), () => {
        p0.assign(mix(p0, p1, float(0.5)))
      })
      If(pointProgress.lessThan(float(controlPointsCount).sub(3)), () => {
        p2.assign(mix(p1, p2, 0.5))
      })
      const strength = textureLoadFix(
        curvePositionTexU,
        ivec2(pointProgress.add(1), curveProgress)
      ).z.toVar('strength')
      return bezierPoint({
        t: pointProgress.fract(),
        p0,
        p1,
        p2,
        strength
      })
    }

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
              settings: firstData.settings
            }
            const progressPoint = mix(p0, p1, t.x)
            // const rotate = lineTangent(p0, p1).toVar('rotate')
            const textureVector = vec2(
              t.x.add(0.5).div(dimensionsU.x),
              t.y.add(0.5).div(dimensionsU.y)
            )
            varyingProperty('vec4', 'colorV').assign(
              vec4(texture(curveColorTex, textureVector))
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
              settings: firstData.settings
            }
            varyingProperty('vec4', 'colorV').assign(
              vec4(texture(curveColorTex, tt))
            )
            thickness.assign(texture(curvePositionTex, tt).w)
            position.assign(
              firstData.settings.pointVert(thisPoint.position, info)
            )
            rotation.assign(thisPoint.rotation)
          })
        })
      })
      thickness.mulAssign(pixel)
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
    material.colorNode = Fn(() => {
      return firstData.settings.pointFrag(colorV)
    })()
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
    const newData = builder.reInitialize(resolution)
    for (let i = 0; i < newData.dimensions.y; i++) {
      controlPointCounts.array[i] = newData.positionArray[i].length
    }

    lastCurveColorLoadU.value.dispose()
    lastCurveColorLoadU.value.dispose()
    firstData.countTex.dispose()
    lastCurvePositionLoadU.value = curvePositionLoadU.value
    lastCurveColorLoadU.value = curveColorLoadU.value
    curvePositionLoadU.value = newData.positionTex
    curveColorLoadU.value = newData.colorTex
    gl.computeAsync(advanceControlPoints)
  }

  const nextTime = useRef<number>(firstData.settings.start / 1000)

  useFrame(state => {
    if (state.clock.elapsedTime > nextTime.current) {
      if (firstData.settings.recalculate) {
        const r = firstData.settings.recalculate
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
    if (rendering && firstData.settings.update) {
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
