import { extend, Object3DNode, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Vector2 } from 'three'
import {
  atan2,
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
  Return,
  screenSize,
  storage,
  texture,
  textureLoad,
  textureStore,
  uniform,
  uniformArray,
  varying,
  varyingProperty,
  vec2,
  vec3,
  vec4
} from 'three/tsl'
import {
  SpriteNodeMaterial,
  StorageBufferAttribute,
  StorageInstancedBufferAttribute,
  StorageTexture,
  WebGPURenderer
} from 'three/webgpu'
import { bezierPoint, lineTangent, multiBezierProgress } from '../tsl/curves'
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

export default function Brush({ builder }: { builder: GroupBuilder }) {
  const [rendering, setRendering] = useState(true)
  // @ts-ignore
  const gl = useThree(({ gl }) => gl as WebGPURenderer)
  const resolution = new Vector2()
  const width = gl.getDrawingBufferSize(resolution).x

  const lastData = builder.reInitialize(resolution)

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
    const totalSpace = lastData.settings.spacing + lastData.settings.gap
    const MAX_INSTANCE_COUNT =
      lastData.settings.spacingType === 'pixel'
        ? lastData.dimensions.y *
          ((lastData.settings.maxLength * width) / totalSpace)
        : lastData.settings.spacingType === 'width'
          ? lastData.dimensions.y *
            ((lastData.settings.maxLength * width) / (totalSpace * width))
          : lastData.settings.spacingType === 'count'
            ? lastData.dimensions.y * width
            : 0
    const geometry = new THREE.PlaneGeometry()
    geometry.translate(lastData.settings.align - 0.5, 0.5, 0)
    const material = new SpriteNodeMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
    const mesh = new THREE.InstancedMesh(geometry, material, MAX_INSTANCE_COUNT)
    mesh.position.set(...lastData.transform.translate.toArray(), 0)
    mesh.scale.set(...lastData.transform.scale.toArray(), 0)
    mesh.rotation.set(0, 0, lastData.transform.rotate)

    const curvePositionTex = new StorageTexture(
      lastData.dimensions.x,
      lastData.dimensions.y
    )
    curvePositionTex.type = THREE.FloatType
    const curveColorTex = new StorageTexture(
      lastData.dimensions.x,
      lastData.dimensions.y
    )
    const controlPointCounts = storage(
      new StorageBufferAttribute(new Int16Array(lastData.dimensions.y), 1),
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
    curveColorLoadU
  } = useMemo(() => {
    const pixel = 1 / width
    const totalSpace = lastData.settings.spacing + lastData.settings.gap

    const dimensionsU = uniform(lastData.dimensions, 'vec2')
    const aspectRatio = screenSize.div(screenSize.x).toVar('screenSize')
    const tAttribute = storage(tArray, 'vec2', MAX_INSTANCE_COUNT)

    const pointI = instanceIndex.modInt(lastData.dimensions.x)
    const curveI = instanceIndex.div(lastData.dimensions.x)
    const curvePositionLoadU = textureLoad(
      lastData.positionTex,
      vec2(pointI, curveI)
    )
    const curveColorLoadU = textureLoad(lastData.colorTex, vec2(pointI, curveI))

    const advanceControlPoints = Fn(() => {
      const textureVector = vec2(
        pointI.toFloat().div(controlPointCounts.element(curveI)),
        curveI.toFloat().div(lastData.dimensions.y)
      )
      const point = lastData.settings.curveVert(
        vec4(curvePositionLoadU),
        textureVector,
        aspectRatio.y
      )
      textureStore(curvePositionTex, vec2(pointI, curveI), point).toWriteOnly()

      const color = lastData.settings.curveFrag(
        vec4(curveColorLoadU),
        textureVector,
        aspectRatio.y
      )
      return textureStore(
        curveColorTex,
        vec2(pointI, curveI),
        color
      ).toWriteOnly()
    })().compute(
      lastData.dimensions.x * lastData.dimensions.y,
      undefined as any
    )

    const sampleCurveLengthsTex = new StorageTexture(100, lastData.dimensions.y)
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
      switch (lastData.settings.spacingType) {
        case 'pixel':
          return int(lastData.settings.maxLength * width).div(totalSpace)
        case 'width':
          return int(lastData.settings.maxLength * width).div(
            int(float(totalSpace).mul(screenSize.x))
          )
        case 'count':
          return int(totalSpace)
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
        .mul(lastData.settings.maxLength)
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
        if (lastData.settings.resample) {
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
        const count = controlPointsCount.mul(6).mul(lastData.settings.maxLength)
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
            if (lastData.settings.resample) {
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
        if (!lastData.settings.resample) {
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
    const thickness = float(10).toVar('thickness')
    const curvePositionTexU = texture(curvePositionTex)

    const main = Fn(() => {
      // @ts-ignore
      const t = tAttribute.toAttribute()
      // dimU = 9 t.y = 8.5/9
      const controlPointsCount = controlPointCounts.element(t.y)

      let point = {
        position: vec2(0, 0).toVar(),
        rotation: float(0).toVar()
      }

      If(t.x.equal(-1), () => {
        varyingProperty('vec4', 'colorV').assign(vec4(0, 0, 0, 0))
      }).Else(() => {
        If(controlPointsCount.equal(2), () => {
          const p0 = textureLoadFix(curvePositionTexU, ivec2(0, t.y)).xy
          const p1 = textureLoadFix(curvePositionTexU, ivec2(1, t.y)).xy
          If(p1.x.equal(-1111), () => {
            varyingProperty('vec4', 'colorV').assign(vec4(0, 0, 0, 0))
          }).Else(() => {
            const progressPoint = mix(p0, p1, t.x)
            point.position.assign(progressPoint)
            const rotation = lineTangent(p0, p1)
            point.rotation.assign(atan2(rotation.y, rotation.x))
            const textureVector = vec2(
              t.x.add(0.5).div(dimensionsU.x),
              t.y.add(0.5).div(dimensionsU.y)
            )
            varyingProperty('vec4', 'colorV').assign(
              texture(curveColorTex, textureVector)
            )
            thickness.assign(texture(curvePositionTex, textureVector).w)
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
            varyingProperty('vec4', 'colorV').assign(texture(curveColorTex, tt))
            thickness.assign(texture(curvePositionTex, tt).w)
            point.position.assign(thisPoint.position)
            point.rotation.assign(thisPoint.rotation)
          })
        })

        rotation.assign(
          vec3(lastData.settings.pointRotate(point.rotation), 0, 0)
        )
      })

      return vec4(lastData.settings.pointVert(point.position), 0, 1)
    })

    material.positionNode = main()
    material.rotationNode = rotation

    material.scaleNode = lastData.settings
      .pointScale(vec2(thickness.mul(pixel), lastData.settings.spacing * pixel))
      .div(vec2(lastData.transform.scale))

    const colorV = varying(vec4(), 'colorV')
    material.colorNode = lastData.settings.pointFrag(colorV)

    return {
      advanceControlPoints,
      updateCurveLengths,
      controlPointCounts,
      curvePositionLoadU,
      curveColorLoadU,
      tArray
    }
  }, [builder])

  let timeout: number
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
        lastData.colorTex.dispose()
        lastData.positionTex.dispose()
        lastData.countTex.dispose()
        curvePositionLoadU.value = newData.positionTex
        curveColorLoadU.value = newData.colorTex
        gl.computeAsync(advanceControlPoints)
        gl.computeAsync(updateCurveLengths)
      })

    // if (newData.settings.spacingType === 'count' && rendering) {
    //   gl.computeAsync(updateCurveLengths)
    // }

    if (newData.settings.recalculate) {
      const r = newData.settings.recalculate
      const waitTime =
        typeof r === 'boolean' ? 40 : typeof r === 'number' ? r : r()

      timeout = window.setTimeout(reInitialize, waitTime)
    }
  }

  const update = () => {
    if (lastData.settings.spacingType === 'count') {
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
    reInitialize()

    if (lastData.settings.recalculate) {
      const r = lastData.settings.recalculate
      const waitTime =
        typeof r === 'boolean' ? 40 : typeof r === 'number' ? r : r()

      timeout = window.setTimeout(reInitialize, waitTime)
    }

    if (rendering && lastData.settings.update) {
      updating = requestAnimationFrame(update)
    }
    return () => {
      clearTimeout(timeout)
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
      mesh.dispose()
      material.dispose()
      geometry.dispose()
      curvePositionTex.dispose()
      curveColorTex.dispose()
    }
  }, [])

  return (
    <>
      {/* {rendering && <primitive object={mesh} />} */}
      {/* <mesh position={[0.5, 0.5, 0]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={sampleCurveLengthsTex} />
      </mesh> */}
    </>
  )
}
