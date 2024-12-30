import { isEqual, now } from 'lodash'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import * as THREE from 'three'
import { Vector2 } from 'three'
import {
  atan2,
  attribute,
  cos,
  float,
  Fn,
  If,
  instanceIndex,
  ivec2,
  log,
  mat2,
  mix,
  PI2,
  pow,
  sampler,
  screenSize,
  select,
  sin,
  texture,
  textureLoad,
  textureStore,
  uniform,
  uniformArray,
  uvec2,
  varying,
  varyingProperty,
  vec2,
  vec3,
  vec4,
  wgslFn
} from 'three/tsl'
import {
  SpriteNodeMaterial,
  StorageInstancedBufferAttribute,
  StorageTexture,
  WebGPURenderer
} from 'three/webgpu'
import { useEventListener, useInterval } from '../dom'
import Builder from './Builder'
import { extend, useFrame, useThree } from '@react-three/fiber'
import { updateInstanceAttribute } from '../three'
import { bezierPoint, lineTangent, multiBezierProgress } from '../tsl/curves'

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

export default function Brush({
  builder
}: {
  builder: ConstructorParameters<typeof Builder>[0]
}) {
  const keyframes = new Builder(builder)

  const resolution = new Vector2(
    window.innerWidth * window.devicePixelRatio,
    window.innerHeight * window.devicePixelRatio
  )

  const [lastData, setLastData] = useState(keyframes.reInitialize(resolution))
  const colorTexRef = useRef(lastData.colorTex)
  colorTexRef.current = lastData.colorTex
  const thicknessTexRef = useRef(lastData.thicknessTex)
  thicknessTexRef.current = lastData.thicknessTex

  // @ts-ignore
  const gl = useThree(({ gl }) => gl as WebGPURenderer)

  const storageTexture = new StorageTexture(
    lastData.dimensions.x,
    lastData.dimensions.y
  )
  storageTexture.type = THREE.FloatType
  storageTexture.minFilter = storageTexture.magFilter = THREE.NearestFilter
  const dimensionsU = uniform(lastData.dimensions, 'vec2')

  // @ts-ignore
  const textureLoadFix = wgslFn<{
    tex: StorageTexture
    uv: ReturnType<typeof vec2>
  }>(/*wgsl*/ `
    fn loadTexture(tex: texture_2d<f32>, uv: vec2<f32>) -> vec4<f32> {
      return textureLoad(tex, uv, 0);
    }`)

  useEffect(() => {
    const advanceControlPoints = Fn(
      ({
        keyframesTex,
        storageTexture,
        dimensions
      }: {
        keyframesTex: THREE.DataTexture
        storageTexture: StorageTexture
        dimensions: ReturnType<typeof vec2>
      }) => {
        const pointI = instanceIndex.modInt(dimensions.x)
        const curveI = instanceIndex.div(dimensions.y)
        const xyz = textureLoad(keyframesTex, ivec2(pointI, curveI)).xyz
        return textureStore(
          storageTexture,
          ivec2(pointI, curveI),
          vec4(xyz, 1)
        ).toWriteOnly()
      }
    )
    // @ts-ignore
    const computeNode = advanceControlPoints({
      keyframesTex: lastData.keyframesTex,
      storageTexture,
      dimensions: vec2(lastData.dimensions)
      // @ts-ignore
    }).compute(1000000)
    gl.computeAsync(computeNode).then(() => {
      material.needsUpdate = true
    })
  }, [lastData])

  const meshRef = useRef<THREE.Group>(null!)

  const material = useMemo(() => {
    const material = new SpriteNodeMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
    return material
  }, [])

  useMemo(() => {
    const rotation = float(0).toVar('rotation')
    const thickness = float(10).toVar('thickness')
    const t = attribute('t', 'vec2')
    const aspectRatio = screenSize.div(screenSize.x).toVar('screenSize')
    const controlPointCounts = uniformArray(
      lastData.groups[0].controlPointCounts as any,
      'int'
    )

    const main = Fn(({ storageTex }: { storageTex: THREE.Texture }) => {
      // TODO: fix instancing...
      const curveProgress = t.y.add(0.5).div(dimensionsU.y)
      const controlPointsCount = controlPointCounts.element(t.y)

      let point = {
        position: vec2(0, 0).toVar('thisPosition'),
        rotation: float(0).toVar('thisRotation')
      }

      If(controlPointsCount.equal(2), () => {
        const p0 = textureLoadFix({
          tex: storageTex,
          uv: ivec2(0, t.y)
        }).xy.toVar('p0')
        const p1 = textureLoadFix({
          tex: storageTex,
          uv: ivec2(1, t.y)
        }).xy.toVar('p1')
        const progressPoint = mix(p0, p1, t.x)
        point.position.assign(progressPoint)
        const rotation = lineTangent(p0, p1, aspectRatio)
        point.rotation.assign(atan2(rotation.y, rotation.x))
        const textureVector = vec2(
          t.x.add(0.5).div(dimensionsU.x),
          curveProgress
        )
        varyingProperty('vec4', 'colorV').assign(
          texture(colorTexRef.current, textureVector)
        )
        thickness.assign(texture(thicknessTexRef.current, textureVector))
      }).Else(() => {
        const pointProgress = multiBezierProgress({
          t: t.x,
          controlPointsCount
        })
        const tt = vec2(
          t.x.mul(controlPointsCount.sub(1)).add(0.5).div(dimensionsU.x),
          curveProgress
        )
        const p0 = textureLoadFix({
          tex: storageTex,
          uv: ivec2(pointProgress.x, t.y)
        }).xy.toVar('p0')
        const p1 = textureLoadFix({
          tex: storageTex,
          uv: ivec2(pointProgress.x.add(1), t.y)
        }).xy.toVar('p1')
        const p2 = textureLoadFix({
          tex: storageTex,
          uv: ivec2(pointProgress.x.add(2), t.y)
        }).xy.toVar('p2')
        const strength = textureLoadFix({
          tex: storageTex,
          uv: ivec2(pointProgress.x.add(1), t.y)
        }).z.toVar('strength')

        varyingProperty('vec4', 'colorV').assign(
          texture(colorTexRef.current, tt)
        )
        thickness.assign(texture(thicknessTexRef.current, tt))

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
        // point.position.assign(p0)
        point.position.assign(thisPoint.position)
        point.rotation.assign(thisPoint.rotation)
      })

      rotation.assign(vec3(point.rotation, 0, 0))
      return vec4(point.position, 0, 1)
    })

    material.positionNode = main({ storageTex: storageTexture })
    material.rotationNode = rotation
    const pixel = float(1.414).mul(2).div(resolution.length())
    material.scaleNode = vec2(thickness.mul(pixel), pixel)

    const vDirection = varying(vec4(), 'colorV')
    material.colorNode = vDirection
    material.needsUpdate = true
  }, [lastData])

  const instanceCount = Math.floor(
    lastData.groups[0].totalCurveLength / lastData.settings.spacing
  )
  const MAX_INSTANCE_COUNT = useMemo(
    () => (lastData.groups[0].totalCurveLength / lastData.settings.spacing) * 2,
    []
  )

  const array = useMemo(() => new Float32Array(MAX_INSTANCE_COUNT * 2), [])

  useLayoutEffect(() => {
    // ~10ms
    if (!meshRef.current) return

    meshRef.current.children.forEach(child => {
      const c = child as THREE.InstancedMesh<
        THREE.PlaneGeometry,
        SpriteNodeMaterial
      >
      c.count = instanceCount
      const bufGeom = c.geometry.getAttribute(
        't'
      ) as StorageInstancedBufferAttribute
      let currentIndex = 0
      let lastCurve = 0
      let curveLength = lastData.groups[0].curveEnds[currentIndex] - lastCurve
      for (let i = 0; i < instanceCount; i++) {
        if (lastData.groups[0].curveEnds[currentIndex] <= i) {
          currentIndex++
          lastCurve = lastData.groups[0].curveEnds[currentIndex - 1]
          curveLength = lastData.groups[0].curveEnds[currentIndex] - lastCurve
        }
        array[i * 2] = (i - lastCurve) / curveLength
        array[i * 2 + 1] = currentIndex
      }
      bufGeom.needsUpdate = true
    })
  }, [lastData])

  console.log(storageTexture.image, lastData.keyframesTex.image)

  return (
    <>
      <mesh position={[0.75, 0.75, 0]}>
        <meshBasicMaterial map={storageTexture} />
        <planeGeometry args={[0.5, 0.5]} />
      </mesh>
      <mesh position={[0.25, 0.75, 0]}>
        <meshBasicMaterial map={lastData.keyframesTex} />
        <planeGeometry args={[0.5, 0.5]} />
      </mesh>
      <group
        ref={meshRef}
        position={[...lastData.transform.translate.toArray(), 0]}
        scale={[...lastData.transform.scale.toArray(), 1]}
        rotation={[0, 0, lastData.transform.rotate]}>
        {lastData.groups.map((group, i) => (
          <instancedMesh
            position={[...group.transform.translate.toArray(), 0]}
            scale={[...group.transform.scale.toArray(), 1]}
            rotation={[0, 0, group.transform.rotate]}
            key={i}
            count={MAX_INSTANCE_COUNT}
            material={material}>
            <planeGeometry args={lastData.settings.defaults.size}>
              <storageInstancedBufferAttribute
                attach='attributes-t'
                args={[array, 2]}
              />
            </planeGeometry>
          </instancedMesh>
        ))}
      </group>
    </>
  )
}
