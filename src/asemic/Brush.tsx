import { extend, Object3DNode, useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import * as THREE from 'three'
import { Vector2 } from 'three'
import {
  atan2,
  Break,
  ceil,
  float,
  Fn,
  If,
  instanceIndex,
  int,
  ivec2,
  Loop,
  mix,
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
  StorageInstancedBufferAttribute,
  StorageTexture,
  WebGPURenderer
} from 'three/webgpu'
import { bezierPoint, lineTangent, multiBezierProgress } from '../tsl/curves'
import { textureLoadFix } from '../tsl/utility'
import Builder from './Builder'

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

export default function Brush({
  lastData
}: {
  lastData: ReturnType<Builder['packToTexture']>[number]
}) {
  // @ts-ignore
  const gl = useThree(({ gl }) => gl as WebGPURenderer)
  const scene = useThree(({ scene }) => scene)

  useEffect(() => {
    const resolution = new Vector2()
    const width = gl.getDrawingBufferSize(resolution).x
    const MAX_INSTANCE_COUNT =
      lastData.settings.spacingType === 'pixel'
        ? (lastData.controlPointCounts.length *
            lastData.settings.maxLength *
            width) /
          lastData.settings.spacing
        : lastData.settings.spacingType === 'width'
          ? (lastData.controlPointCounts.length *
              lastData.settings.maxLength *
              width) /
            (lastData.settings.spacing * width)
          : lastData.settings.spacingType === 'count'
            ? lastData.controlPointCounts.length * width
            : 0

    const curvePositionTex = new StorageTexture(
      lastData.dimensions.x,
      lastData.dimensions.y
    )
    curvePositionTex.type = THREE.FloatType
    const curveColorTex = new StorageTexture(
      lastData.dimensions.x,
      lastData.dimensions.y
    )

    const controlPointCounts = uniformArray(
      lastData.controlPointCounts as any,
      'int'
    )
    const dimensionsU = uniform(lastData.dimensions, 'vec2')
    const aspectRatio = screenSize.div(screenSize.x).toVar('screenSize')

    const advanceControlPoints = Fn(() => {
      const pointI = instanceIndex.modInt(lastData.dimensions.x)
      const curveI = instanceIndex.div(lastData.dimensions.x)

      const load = textureLoad(lastData.positionTex, vec2(pointI, curveI))
      const point = lastData.settings.curveVert(
        vec4(load),
        vec2(
          pointI.toFloat().div(controlPointCounts.element(curveI)),
          curveI.toFloat().div(lastData.controlPointCounts.length)
        ),
        aspectRatio.y
      )
      textureStore(curvePositionTex, vec2(pointI, curveI), point).toWriteOnly()

      const colorLoad = textureLoad(lastData.colorTex, vec2(pointI, curveI))
      const color = lastData.settings.curveFrag(vec4(colorLoad), {
        tPoint: pointI.toFloat().div(controlPointCounts.element(curveI)),
        tCurve: curveI.toFloat().div(lastData.controlPointCounts.length)
      })
      return textureStore(
        curveColorTex,
        vec2(pointI, curveI),
        color
      ).toWriteOnly()
    })().compute(
      lastData.dimensions.x * lastData.dimensions.y,
      undefined as any
    )

    // TODO: compute the lengths before adding this together
    const updateCurveLengths = /*#__PURE__*/ Fn(() => {
      const generateSpacing = () => {
        switch (lastData.settings.spacingType) {
          case 'pixel':
            return int(lastData.settings.maxLength * width).div(
              lastData.settings.spacing
            )
          case 'width':
            return int(lastData.settings.maxLength * width).div(
              int(float(lastData.settings.spacing).mul(screenSize.x))
            )
          case 'count':
            return int(lastData.settings.spacing)
        }
      }

      const instancesPerCurve = generateSpacing()
      const curveProgress = instanceIndex.div(instancesPerCurve)
      const pointProgress = instanceIndex
        .modInt(instancesPerCurve)
        .toFloat()
        .div(instancesPerCurve.toFloat())
        .mul(lastData.settings.maxLength)

      const thisEnd = float(0).toVar('thisEnd')
      const lastPoint = vec2(0, 0).toVar('lastPoint')
      const thisPoint = vec2(0, 0).toVar('thisPoint')
      thisPoint.assign(
        textureLoadFix(texture(curvePositionTex), ivec2(0, curveProgress)).xy
      )
      Loop(
        {
          start: 1,
          end: controlPointCounts.element(curveProgress),
          type: 'float'
        },
        ({ i: j }) => {
          lastPoint.assign(thisPoint)
          thisPoint.assign(
            textureLoadFix(texture(curvePositionTex), ivec2(j, curveProgress))
              .xy
          )
          thisEnd.addAssign(thisPoint.sub(lastPoint).length())
        }
      )
      If(pointProgress.greaterThan(thisEnd), () => {
        tAttribute.element(instanceIndex).xy.assign(vec2(-1, -1))
      }).Else(() => {
        tAttribute
          .element(instanceIndex)
          .xy.assign(vec2(pointProgress.div(thisEnd), curveProgress))
      })

      return undefined as any
    })().compute(MAX_INSTANCE_COUNT, undefined as any)

    const geometry = new THREE.PlaneGeometry()
    geometry.translate(-0.5, 0, 0)
    const tArray = new StorageInstancedBufferAttribute(MAX_INSTANCE_COUNT, 2)
    const tAttribute = storage(tArray, 'vec2', MAX_INSTANCE_COUNT)

    const material = new SpriteNodeMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })

    const rotation = float(0).toVar('rotation')
    const thickness = float(10).toVar('thickness')

    const main = Fn(() => {
      // @ts-ignore
      const t = tAttribute.toAttribute()
      // dimU = 9 t.y = 8.5/9
      const controlPointsCount = controlPointCounts.element(t.y)

      let point = {
        position: vec2(0, 0).toVar(),
        rotation: float(0).toVar()
      }

      const curvePositionTexU = texture(curvePositionTex)

      If(t.x.equal(-1), () => {
        varyingProperty('vec4', 'colorV').assign(vec4(0, 0, 0, 0))
      }).Else(() => {
        If(controlPointsCount.equal(2), () => {
          const p0 = textureLoadFix(curvePositionTexU, ivec2(0, t.y)).xy
          const p1 = textureLoadFix(curvePositionTexU, ivec2(1, t.y)).xy
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
        }).Else(() => {
          const pointProgress = multiBezierProgress({
            t: t.x,
            controlPointsCount
          })
          const tt = vec2(
            // 2 points: 0.5-1.5
            t.x.mul(controlPointsCount.sub(1)).add(0.5).div(dimensionsU.x),
            t.y.add(0.5).div(dimensionsU.y)
          )
          const p0 = textureLoadFix(
            curvePositionTexU,
            ivec2(pointProgress.x, t.y)
          ).xy.toVar('p0')
          const p1 = textureLoadFix(
            curvePositionTexU,
            ivec2(pointProgress.x.add(1), t.y)
          ).xy.toVar('p1')
          const p2 = textureLoadFix(
            curvePositionTexU,
            ivec2(pointProgress.x.add(2), t.y)
          ).xy.toVar('p2')
          const strength = textureLoadFix(
            curvePositionTexU,
            ivec2(pointProgress.x.add(1), t.y)
          ).z.toVar('strength')

          varyingProperty('vec4', 'colorV').assign(texture(curveColorTex, tt))
          thickness.assign(texture(lastData.positionTex, tt))

          If(pointProgress.x.greaterThan(float(0)), () => {
            p0.assign(mix(p0, p1, float(0.5)))
          })
          If(pointProgress.x.lessThan(float(controlPointsCount).sub(3)), () => {
            p2.assign(mix(p1, p2, 0.5))
          })
          const thisPoint = bezierPoint({
            t: pointProgress.y,
            p0,
            p1,
            p2,
            strength
          })
          point.position.assign(thisPoint.position)
          point.rotation.assign(thisPoint.rotation)
        })

        rotation.assign(vec3(point.rotation, 0, 0))
      })

      return vec4(lastData.settings.pointVert(point.position), 0, 1)
    })

    material.positionNode = main()
    material.rotationNode = rotation

    const pixel = 1 / width
    material.scaleNode = vec2(thickness.mul(pixel), pixel)

    const colorV = varying(vec4(), 'colorV')
    material.colorNode = lastData.settings.pointFrag(colorV)

    const mesh = new THREE.InstancedMesh(geometry, material, MAX_INSTANCE_COUNT)
    mesh.position.set(...lastData.transform.translate.toArray(), 0)
    mesh.scale.set(...lastData.transform.scale.toArray(), 0)
    mesh.rotation.set(0, 0, lastData.transform.rotate)

    // TODO: add back instance counts
    // mesh.count = instanceCount

    scene.add(mesh)

    // if (lastData.settings.spacingType === 'count') {
    //   gl.computeAsync(updateCurveLengths)
    // }
    const update = () => {
      let done = 0
      const finish = () => {
        done++
        if (done == 2) {
          material.needsUpdate = true
          updating = requestAnimationFrame(update)
        }
      }
      gl.computeAsync(advanceControlPoints).then(finish)
      gl.computeAsync(updateCurveLengths).then(finish)
      // if (lastData.settings.spacingType === 'count') {
      //   gl.computeAsync(advanceControlPoints)
      //   material.needsUpdate = true
      //   updating = requestAnimationFrame(update)
      // } else {
      //   const finish = () => {
      //     done++
      //     if (done == 2) {
      //       material.needsUpdate = true
      //       updating = requestAnimationFrame(update)
      //     }
      //   }
      //   gl.computeAsync(advanceControlPoints).then(finish)
      //   gl.computeAsync(updateCurveLengths).then(finish)
      // }
    }
    let updating = requestAnimationFrame(update)
    // window.setTimeout(
    //   () =>
    //     gl.getArrayBufferAsync(tArray).then(buffer =>
    //       console.log(
    //         Array.from(new Float32Array(buffer))
    //           .flatMap((x, i) => (i % 2 ? [] : x.toFixed(4)))
    //           .join(' ')
    //       )
    //     ),
    //   500
    // )
    return () => {
      scene.remove(mesh)
      mesh.dispose()
      cancelAnimationFrame(updating)
    }
  }, [lastData])

  return <></>
}
