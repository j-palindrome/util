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
  log,
  mat2,
  mix,
  PI2,
  pow,
  screenSize,
  select,
  sin,
  texture,
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
  StorageInstancedBufferAttribute
} from 'three/webgpu'
import { useEventListener } from '../dom'
import Builder from './Builder'
import { extend, useFrame } from '@react-three/fiber'

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
  render
}: {
  render: ConstructorParameters<typeof Builder>[0]
}) {
  const keyframes = new Builder(render)

  const resolution = new Vector2(
    window.innerWidth * window.devicePixelRatio,
    window.innerHeight * window.devicePixelRatio
  )

  const [lastData, setLastData] = useState(keyframes.reInitialize(resolution))
  const { groups, transform, dimensions, settings } = lastData
  const keyframesTexRef = useRef(lastData.keyframesTex)
  keyframesTexRef.current = lastData.keyframesTex
  const colorTexRef = useRef(lastData.colorTex)
  colorTexRef.current = lastData.colorTex
  const thicknessTexRef = useRef(lastData.thicknessTex)
  thicknessTexRef.current = lastData.thicknessTex

  const meshRef = useRef<THREE.Group>(null!)
  const material = useMemo(() => {
    const material = new SpriteNodeMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })

    const aspectRatio = screenSize.div(screenSize.x).toVar('screenSize')
    const controlPointCounts = uniformArray(
      groups[0].controlPointCounts as any,
      'int'
    )
    const dimensionsU = uniform(dimensions, 'vec2')

    // Define the Bezier functions
    const bezier2 = ({ t, p0, p1, p2 }) => {
      return p0
        .mul(t.oneMinus().pow(2))
        .add(p1.mul(t.oneMinus().mul(t).mul(2)))
        .add(p2.mul(t.pow(2)))
    }

    const rotate2d = (
      v: ReturnType<typeof vec2>,
      a: number | ReturnType<typeof float>
    ) => {
      const s = sin(PI2.mul(a))
      const c = cos(PI2.mul(a))
      const m = mat2(c, s.mul(-1), s, c)
      return m.mul(v)
    }

    const lineTangent = (
      p0: ReturnType<typeof vec2>,
      p1: ReturnType<typeof vec2>
    ) => {
      return rotate2d(p0.sub(p1).mul(aspectRatio), 0.25)
    }

    const bezier2Tangent = ({
      t,
      p0,
      p1,
      p2
    }: {
      t: ReturnType<typeof float>
      p0: ReturnType<typeof vec2>
      p1: ReturnType<typeof vec2>
      p2: ReturnType<typeof vec2>
    }) => {
      return rotate2d(
        p1
          .sub(p0)
          .mul(float(2).mul(t.oneMinus()))
          .add(p2.sub(p1).mul(float(2).mul(t))),
        float(0.25)
      ).mul(aspectRatio)
    }

    const polyLine = ({
      t,
      p0,
      p1,
      p2
    }: {
      t: ReturnType<typeof float>
      p0: ReturnType<typeof vec2>
      p1: ReturnType<typeof vec2>
      p2: ReturnType<typeof vec2>
    }) => {
      const l0 = p1.sub(p0).length()
      const l1 = p2.sub(p1).length()
      const totalLength = l0.add(l1)
      const progress = t.mul(totalLength)
      return select(
        progress.greaterThan(l0),
        mix(p1, p2, progress.sub(l0).div(l1)),
        mix(p0, p1, progress.div(l0))
      )
    }

    // Function to calculate a point on a Bezier curve
    const bezierPoint = ({ t, p0, p1, p2, strength }) => {
      const positionCurve = bezier2({ t, p0, p1, p2 })
      const positionStraight = polyLine({ t, p0, p1, p2 })
      const position = mix(positionCurve, positionStraight, pow(strength, 2))
      const tangent = bezier2Tangent({ t, p0, p1, p2 })
      const rotation = atan2(tangent.y, tangent.x)
      return { position, rotation }
    }

    const multiBezierProgress = ({ t, controlPointsCount }) => {
      const subdivisions = float(controlPointsCount).sub(2)
      const start = t.mul(subdivisions).toInt()
      const cycle = t.mul(subdivisions).fract()
      return vec2(start, cycle)
    }

    const rotation = float(0).toVar('rotation')
    const thickness = float(10).toVar('thickness')
    const t = attribute('t', 'vec2')

    const main = Fn(() => {
      const curveProgress = t.y.add(0.5).div(dimensionsU.y)
      const controlPointsCount = controlPointCounts.element(t.y)

      let point = {
        position: vec2(0, 0).toVar(),
        rotation: float(0).toVar()
      }

      If(controlPointsCount.equal(2), () => {
        const p0 = texture(keyframesTexRef.current, vec2(0, curveProgress)).xy
        const p1 = texture(
          keyframesTexRef.current,
          vec2(float(1).div(dimensionsU.x), curveProgress)
        ).xy
        const progressPoint = mix(p0, p1, t.x)
        point.position.assign(progressPoint)
        const rotation = lineTangent(p0, p1)
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
        const p0 = texture(keyframesTexRef.current, t0).xy.toVar('p0')
        const p1 = texture(keyframesTexRef.current, t1).xy.toVar('p1')
        const p2 = texture(keyframesTexRef.current, t2).xy.toVar('p2')
        const strength = texture(keyframesTexRef.current, t1).z.toVar(
          'strength'
        )

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
          strength
        })
        // point.position.assign(p0)
        point.position.assign(thisPoint.position)
        point.rotation.assign(thisPoint.rotation)
      })

      rotation.assign(vec3(point.rotation, 0, 0))
      return vec4(point.position, 0, 1)
    })

    material.positionNode = main()
    material.rotationNode = rotation
    const pixel = float(1.414).mul(2).div(resolution.length())
    material.scaleNode = vec2(thickness.mul(pixel), pixel)

    const vDirection = varying(vec4(), 'colorV')
    material.colorNode = vDirection

    return material
  }, [])

  useFrame(() => {
    const resolution = new Vector2(
      window.innerWidth * window.devicePixelRatio,
      window.innerHeight * window.devicePixelRatio
    )
    const newData = keyframes.reInitialize(resolution)
    setLastData(newData)
  })

  const instanceCount = Math.floor(
    groups[0].totalCurveLength / settings.spacing
  )
  const MAX_INSTANCE_COUNT = useMemo(
    () => (groups[0].totalCurveLength / settings.spacing) * 2,
    []
  )

  const array = new Float32Array(MAX_INSTANCE_COUNT * 2)
  useMemo(() => {
    let currentIndex = 0
    let lastCurve = 0
    let curveLength = groups[0].curveEnds[currentIndex] - lastCurve
    for (let i = 0; i < instanceCount; i++) {
      if (groups[0].curveEnds[currentIndex] <= i) {
        currentIndex++
        lastCurve = groups[0].curveEnds[currentIndex - 1]
        curveLength = groups[0].curveEnds[currentIndex] - lastCurve
      }
      array[i * 2] = (i - lastCurve) / curveLength
      array[i * 2 + 1] = currentIndex
    }
  }, [instanceCount])

  useLayoutEffect(() => {
    if (!meshRef.current) return
    meshRef.current.children.forEach(child => {
      child.material.needsUpdate = true
      child.count = instanceCount
    })
  }, [instanceCount])

  return (
    <group
      ref={meshRef}
      position={[...transform.translate.toArray(), 0]}
      scale={[...transform.scale.toArray(), 1]}
      rotation={[0, 0, transform.rotate]}>
      {groups.map((group, i) => (
        <instancedMesh
          position={[...group.transform.translate.toArray(), 0]}
          scale={[...group.transform.scale.toArray(), 1]}
          rotation={[0, 0, group.transform.rotate]}
          key={i + now()}
          count={MAX_INSTANCE_COUNT}
          material={material}>
          <planeGeometry args={lastData.settings.defaults.size}>
            <storageInstancedBufferAttribute
              attach='attributes-t'
              args={[array.subarray(0, instanceCount * 2), 2]}
            />
          </planeGeometry>
        </instancedMesh>
      ))}
    </group>
  )
}
