import { extend, Object3DNode, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Vector2 } from 'three'
import {
  arrayBuffer,
  atan,
  Break,
  float,
  Fn,
  If,
  instanceIndex,
  int,
  ivec2,
  Loop,
  mix,
  remap,
  screenSize,
  select,
  storage,
  texture,
  textureLoad,
  textureStore,
  uniform,
  varying,
  varyingProperty,
  vec2,
  vec3,
  vec4,
  vertexIndex
} from 'three/tsl'
import {
  MeshBasicNodeMaterial,
  SpriteNodeMaterial,
  StorageBufferAttribute,
  StorageInstancedBufferAttribute,
  StorageTexture,
  WebGPURenderer
} from 'three/webgpu'
import { bezierPoint, lineTangent } from '../tsl/curves'
import { textureLoadFix } from '../tsl/utility'
import { GroupBuilder } from './Builder'
import _ from 'lodash'

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

export default function MeshBrush({ builder }: { builder: GroupBuilder }) {
  const [rendering, setRendering] = useState(true)
  // @ts-ignore
  const gl = useThree(({ gl }) => gl as WebGPURenderer)
  const resolution = new Vector2()
  const width = gl.getDrawingBufferSize(resolution).x
  const firstData = useMemo(() => builder.reInitialize(resolution), [builder])

  const {
    mesh,
    material,
    geometry,
    MAX_INSTANCE_COUNT,
    curvePositionTex,
    curveColorTex,
    controlPointCounts,
    tArray
  } = useMemo(() => {
    const MAX_INSTANCE_COUNT = Math.floor(
      firstData.settings.gapType === 'pixel'
        ? firstData.dimensions.y *
            ((firstData.settings.maxLength * width) / firstData.settings.gap)
        : firstData.settings.gapType === 'width'
          ? firstData.dimensions.y *
            ((firstData.settings.maxLength * width) /
              (firstData.settings.gap * width))
          : firstData.settings.gapType === 'count'
            ? firstData.dimensions.y * firstData.settings.gap
            : 0
    )
    console.log(MAX_INSTANCE_COUNT)

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(MAX_INSTANCE_COUNT * 2 * 3, 3)
    )
    const indexGuide = [0, 1, 2, 1, 2, 3]
    const indexes = _.range(MAX_INSTANCE_COUNT).flatMap(x =>
      indexGuide.map(i => x * 2 + i)
    )
    geometry.setIndex(indexes)
    // console.log(indexes)

    const material = new MeshBasicNodeMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
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
    const controlPointCounts = storage(
      new StorageBufferAttribute(new Int16Array(firstData.dimensions.y), 1),
      'int'
    )
    const tArray = new StorageInstancedBufferAttribute(MAX_INSTANCE_COUNT, 2)
    return {
      mesh,
      material,
      geometry,
      MAX_INSTANCE_COUNT,
      curvePositionTex,
      curveColorTex,
      controlPointCounts,
      tArray
    }
  }, [])

  const {
    advanceControlPoints,
    updateCurveLengths,
    curvePositionLoadU,
    curveColorLoadU,
    lastCurvePositionLoadU,
    lastCurveColorLoadU
  } = useMemo(() => {
    const pixel = 1 / width

    const dimensionsU = uniform(firstData.dimensions, 'vec2')
    const aspectRatio = screenSize.div(screenSize.x).toVar('screenSize')
    const tAttribute = storage(tArray, 'vec2', MAX_INSTANCE_COUNT)

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

    const generateSpacing = () => {
      switch (firstData.settings.gapType) {
        case 'pixel':
          return int(firstData.settings.maxLength * width).div(
            firstData.settings.gap
          )
        case 'width':
          return int(firstData.settings.maxLength * width).div(
            int(float(firstData.settings.gap).mul(screenSize.x))
          )
        case 'count':
          return int(firstData.settings.gap)
      }
    }

    const instancesPerCurve = generateSpacing()

    const updateCurveLengths = /*#__PURE__*/ Fn(() => {
      const curveProgress = instanceIndex.div(instancesPerCurve)
      const controlPointsCount = controlPointCounts.element(curveProgress)
      const found = float(0).toVar('found')
      const targetLength = instanceIndex
        .modInt(instancesPerCurve)
        .toFloat()
        .div(instancesPerCurve.toFloat())
        .mul(firstData.settings.maxLength)
      const totalLength = float(0).toVar('totalLength')
      If(controlPointsCount.equal(2), () => {
        const p0 = textureLoadFix(
          texture(curvePositionTex),
          ivec2(0, curveProgress)
        ).xy
        const p1 = textureLoadFix(
          texture(curvePositionTex),
          ivec2(1, curveProgress)
        ).xy
        totalLength.assign(p1.sub(p0).length())
        if (firstData.settings.resample) {
          If(totalLength.greaterThanEqual(targetLength), () => {
            found.assign(1)
            tAttribute
              .element(instanceIndex)
              .assign(vec2(targetLength.div(totalLength), curveProgress))
          })
        }
      }).Else(() => {
        const lastEnd = float(0).toVar('lastEnd')
        const lastPoint = vec2(0, 0).toVar('lastPoint')
        const thisPoint = vec2(0, 0).toVar('thisPoint')
        thisPoint.assign(
          textureLoadFix(texture(curvePositionTex), ivec2(0, curveProgress)).xy
        )
        // Find the subdivisions, then linearly interpolate between the subdivisions...on the graphics card.
        const count = controlPointsCount
          .mul(6)
          .mul(firstData.settings.maxLength)
        Loop(
          {
            start: 1,
            end: count,
            type: 'float'
          },
          ({ i }) => {
            lastPoint.assign(thisPoint)
            const t = i.div(count).mul(controlPointsCount.sub(2))
            thisPoint.assign(
              getBezier(t, curveProgress, controlPointsCount).position
            ).xy
            lastEnd.assign(totalLength)
            totalLength.addAssign(thisPoint.sub(lastPoint).length())
            if (firstData.settings.resample) {
              If(totalLength.greaterThanEqual(targetLength), () => {
                const remapped = remap(targetLength, lastEnd, totalLength, 0, 1)
                found.assign(1)
                tAttribute
                  .element(instanceIndex)
                  .assign(
                    vec2(
                      i
                        .sub(1)
                        .add(remapped)
                        .div(count)
                        .mul(controlPointsCount.sub(2)),
                      curveProgress
                    )
                  )
                Break()
              })
            }
          }
        )
        if (!firstData.settings.resample) {
          If(totalLength.greaterThanEqual(targetLength), () => {
            found.assign(1)
            tAttribute
              .element(instanceIndex)
              .assign(
                vec2(
                  targetLength.div(totalLength).mul(controlPointsCount.sub(2)),
                  curveProgress
                )
              )
          })
        }
      })

      If(found.equal(0), () => {
        tAttribute.element(instanceIndex).xy.assign(vec2(-1, -1))
      })

      return undefined as any
    })().compute(MAX_INSTANCE_COUNT, undefined as any)

    const rotation = float(0).toVar('rotation')
    const thickness = float(0).toVar('thickness')
    const curvePositionTexU = texture(curvePositionTex)

    const main = Fn(() => {
      const t = tAttribute.element(vertexIndex.div(2))
      const up = vertexIndex.modInt(2).toVar('up')

      const controlPointsCount = controlPointCounts.element(t.y)
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
            const rotate = lineTangent(p0, p1).toVar('rotate')
            const textureVector = vec2(
              t.x.add(0.5).div(dimensionsU.x),
              t.y.add(0.5).div(dimensionsU.y)
            )
            varyingProperty('vec4', 'colorV').assign(
              vec4(texture(curveColorTex, textureVector))
            )
            thickness.assign(texture(curvePositionTex, textureVector).w)
            position.assign(progressPoint)
            rotation.assign(
              vec2(
                firstData.settings.pointRotate(atan(rotate.y, rotate.x), info),
                0
              )
            )
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
            rotation.assign(
              vec3(
                firstData.settings.pointRotate(thisPoint.rotation, info),
                0,
                0
              )
            )
          })
        })
      })
      position.assign(
        vec2(t.x, select(vertexIndex.modInt(2).equal(0), 0.5, 0.7))
      )
      return vec4(position, 0, 1)
    })

    material.positionNode = main()
    // material.rotationNode = rotation

    // material.scaleNode = firstData.settings.pointScale(
    //   vec2(thickness, firstData.settings.spacing).mul(pixel)
    // )

    // const colorV = varying(vec4(), 'colorV')
    // material.colorNode = firstData.settings.pointFrag(colorV)
    material.needsUpdate = true

    return {
      advanceControlPoints,
      updateCurveLengths,
      curvePositionLoadU,
      curveColorLoadU,
      lastCurvePositionLoadU,
      lastCurveColorLoadU
    }
  }, [builder])

  let updating: number

  const reInitialize = () => {
    const newData = builder.reInitialize(resolution)

    const updateCurveCounts = Fn(() => {
      controlPointCounts
        .element(instanceIndex)
        .assign(textureLoad(newData.countTex, ivec2(0, instanceIndex)))
      return undefined as any
    })().compute(newData.dimensions.y, undefined as any)

    gl.computeAsync(updateCurveCounts)
      .catch(() => {
        console.log('out of memory')
        setRendering(false)
      })
      .then(() => {
        lastCurveColorLoadU.value.dispose()
        lastCurveColorLoadU.value.dispose()
        firstData.countTex.dispose()
        lastCurvePositionLoadU.value = curvePositionLoadU.value
        lastCurveColorLoadU.value = curveColorLoadU.value
        curvePositionLoadU.value = newData.positionTex
        curveColorLoadU.value = newData.colorTex
        gl.computeAsync(advanceControlPoints).then(() => {
          gl.computeAsync(updateCurveLengths)
        })
      })
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
    if (firstData.settings.gapType === 'count') {
      gl.computeAsync(advanceControlPoints)
      material.needsUpdate = true
      updating = requestAnimationFrame(update)
    } else {
      Promise.all([
        gl.computeAsync(advanceControlPoints),
        gl.computeAsync(updateCurveLengths)
      ]).then(() => {
        material.needsUpdate = true
        updating = requestAnimationFrame(update)
      })
    }
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
  }, [])

  return <></>
}
