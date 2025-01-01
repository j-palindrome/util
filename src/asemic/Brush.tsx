import { extend, Object3DNode, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Vector2 } from 'three'
import {
  atan2,
  attribute,
  float,
  Fn,
  If,
  instanceIndex,
  log,
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

    const advanceControlPoints = Fn(() => {
      const pointI = instanceIndex.modInt(lastData.dimensions.x)
      const curveI = instanceIndex.div(lastData.dimensions.x)

      const load = textureLoad(lastData.keyframesTex, vec2(pointI, curveI))
      const point = lastData.settings.curveVert(vec4(load), {
        tPoint: pointI
          .toFloat()
          .div(float(controlPointCounts.element(pointI).sub(1))),
        tCurve: curveI
          .toFloat()
          .div(float(controlPointCounts.getElementLength()))
      })
      textureStore(curvePositionTex, vec2(pointI, curveI), point).toWriteOnly()

      const colorLoad = textureLoad(lastData.colorTex, vec2(pointI, curveI))
      const color = lastData.settings.curveFrag(vec4(colorLoad), {
        tPoint: pointI.toFloat().div(controlPointCounts.element(curveI)),
        tCurve: curveI.toFloat().div(controlPointCounts.getElementLength())
      })
      return textureStore(
        curveColorTex,
        vec2(pointI, curveI),
        color
      ).toWriteOnly()
    })
    // @ts-ignore
    const computeNode = advanceControlPoints().compute(
      lastData.dimensions.x * lastData.dimensions.y
    )
    gl.computeAsync(computeNode).then(() => {
      material.needsUpdate = true
    })

    const instanceCount = Math.floor(
      lastData.totalCurveLength / lastData.settings.spacing
    )

    const MAX_INSTANCE_COUNT =
      (lastData.totalCurveLength / lastData.settings.spacing) * 2

    const array = new Float32Array(MAX_INSTANCE_COUNT * 2)
    // let currentIndex = 0
    // let lastCurve = 0
    // let curveLength = lastData.curveEnds[currentIndex] - lastCurve
    // for (let i = 0; i < instanceCount; i++) {
    //   if (lastData.curveEnds[currentIndex] <= i) {
    //     currentIndex++
    //     lastCurve = lastData.curveEnds[currentIndex - 1]
    //     curveLength = lastData.curveEnds[currentIndex] - lastCurve
    //   }
    //   array[i * 2] = (i - lastCurve) / curveLength
    //   array[i * 2 + 1] = currentIndex
    // }

    const tAttribute = new StorageInstancedBufferAttribute(array, 2)
    const geometry = new THREE.PlaneGeometry()
    geometry.setAttribute('t', tAttribute)

    const curveProgress = storage(tAttribute, 'vec2', MAX_INSTANCE_COUNT)
    // init particles buffers
    gl.computeAsync(
      /*#__PURE__*/ Fn(() => {
        curveProgress
          .element(instanceIndex)
          .xy.assign(
            vec2(
              instanceIndex.modInt(1000).toFloat().div(1000),
              instanceIndex.div(1000)
            )
          )
        return undefined as any
      })().compute(MAX_INSTANCE_COUNT, undefined as any)
    ).then(() => (tAttribute.needsUpdate = true))

    const material = new SpriteNodeMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })

    const rotation = float(0).toVar('rotation')
    const thickness = float(10).toVar('thickness')
    // @ts-ignore
    const t = curveProgress.toAttribute()
    const aspectRatio = screenSize.div(screenSize.x).toVar('screenSize')

    const main = Fn(() => {
      const curveProgress = t.y.add(0.5).div(dimensionsU.y)
      const controlPointsCount = controlPointCounts.element(t.y)

      let point = {
        position: vec2(0, 0).toVar(),
        rotation: float(0).toVar()
      }

      If(controlPointsCount.equal(2), () => {
        const p0 = texture(
          curvePositionTex,
          vec2(float(0.5).div(dimensionsU.x), curveProgress)
        ).xy
        const p1 = texture(
          curvePositionTex,
          vec2(float(1.5).div(dimensionsU.x), curveProgress)
        ).xy
        const progressPoint = mix(p0, p1, t.x)
        point.position.assign(progressPoint)
        const rotation = lineTangent(p0, p1, aspectRatio)
        point.rotation.assign(atan2(rotation.y, rotation.x))
        const textureVector = vec2(
          t.x.add(0.5).div(dimensionsU.x),
          curveProgress
        )
        varyingProperty('vec4', 'colorV').assign(
          texture(curveColorTex, textureVector)
        )
        thickness.assign(texture(lastData.thicknessTex, textureVector))
      }).Else(() => {
        const pointProgress = multiBezierProgress({
          t: t.x,
          controlPointsCount
        })
        const t0 = vec2(
            pointProgress.x.add(0).add(0.5).div(dimensionsU.x),
            curveProgress
          ),
          t1 = vec2(
            pointProgress.x.add(1).add(0.5).div(dimensionsU.x),
            curveProgress
          ),
          t2 = vec2(
            pointProgress.x.add(2).add(0.5).div(dimensionsU.x),
            curveProgress
          ),
          tt = vec2(
            t.x.mul(controlPointsCount.sub(1)).add(0.5).div(dimensionsU.x),
            curveProgress
          )
        const p0 = texture(curvePositionTex, t0).xy.toVar('p0')
        const p1 = texture(curvePositionTex, t1).xy.toVar('p1')
        const p2 = texture(curvePositionTex, t2).xy.toVar('p2')
        const strength = texture(curvePositionTex, t1).z.toVar('strength')

        varyingProperty('vec4', 'colorV').assign(texture(curveColorTex, tt))
        thickness.assign(texture(lastData.thicknessTex, tt))

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
          strength,
          aspectRatio
        })
        point.position.assign(thisPoint.position)
        point.rotation.assign(thisPoint.rotation)
      })

      rotation.assign(vec3(point.rotation, 0, 0))
      return vec4(lastData.settings.pointVert(point.position), 0, 1)
    })
    material.positionNode = main()
    material.rotationNode = rotation
    const resolution = new Vector2(
      window.innerWidth * window.devicePixelRatio,
      window.innerHeight * window.devicePixelRatio
    )
    const pixel = float(1.414).mul(2).div(resolution.length())
    material.scaleNode = vec2(thickness.mul(pixel), pixel)

    const colorV = varying(vec4(), 'colorV')
    material.colorNode = lastData.settings.pointFrag(colorV)

    const mesh = new THREE.InstancedMesh(geometry, material, MAX_INSTANCE_COUNT)
    mesh.position.set(...lastData.transform.translate.toArray(), 0)
    mesh.scale.set(...lastData.transform.scale.toArray(), 0)
    mesh.rotation.set(0, 0, lastData.transform.rotate)

    mesh.count = instanceCount

    scene.add(mesh)
    return () => {
      scene.remove(mesh)
      mesh.dispose()
    }
  }, [])

  return <></>
}
