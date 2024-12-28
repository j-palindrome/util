import { isEqual, now } from 'lodash'
import { useCallback, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Vector2 } from 'three'
import {
  atan2,
  cos,
  float,
  Fn,
  If,
  instanceIndex,
  mat2,
  mix,
  PI2,
  pow,
  screenSize,
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
import { SpriteNodeMaterial } from 'three/webgpu'
import { useEventListener } from '../dom'
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

export default function Brush({
  render
}: {
  render: ConstructorParameters<typeof Builder>[0]
}) {
  const keyframes = new Builder(render)

  useEventListener(
    'resize',
    () => {
      reInitialize()
    },
    []
  )
  const resolution = new Vector2(
    window.innerWidth * window.devicePixelRatio,
    window.innerHeight * window.devicePixelRatio
  )

  const [lastData, setLastData] = useState(keyframes.reInitialize(resolution))
  const {
    keyframesTex,
    colorTex,
    thicknessTex,
    groups,
    transform,
    dimensions,
    settings
  } = lastData

  const meshRef = useRef<THREE.Group>(null!)
  const maxCurveLength = resolution.length() * 2

  // const updateChildren = (newData: typeof lastData) => {
  //   if (!meshRef.current) return
  //   meshRef.current.rotation.set(0, 0, newData.transform.rotate)
  //   meshRef.current.scale.set(...newData.transform.scale.toArray(), 1)
  //   meshRef.current.position.set(...newData.transform.translate.toArray(), 0)

  //   meshRef.current.children.forEach((c, i) => {
  //     const child = c as THREE.InstancedMesh<
  //       THREE.PlaneGeometry,
  //       THREE.ShaderMaterial
  //     >
  //     if (!newData.groups[i]) return
  //     child.material.uniforms.keyframesTex.value = newData.keyframesTex
  //     child.material.uniforms.colorTex.value = newData.colorTex
  //     child.material.uniforms.thicknessTex.value = newData.thicknessTex
  //     child.material.uniforms.curveEnds.value = newData.groups[i].curveEnds
  //     child.material.uniforms.curveIndexes.value =
  //       newData.groups[i].curveIndexes
  //     child.material.uniforms.controlPointCounts.value =
  //       newData.groups[i].controlPointCounts

  //     child.material.uniforms.resolution.value = resolution
  //     child.material.uniforms.dimensions.value = newData.dimensions
  //     child.count = newData.groups[i].totalCurveLength
  //     child.material.uniformsNeedUpdate = true

  //     const { translate, scale, rotate } = newData.groups[i].transform
  //     child.material.uniforms.scaleCorrection.value = scale
  //     child.position.set(translate.x, translate.y, 0)
  //     child.scale.set(scale.x, scale.y, 1)
  //     child.rotation.set(0, 0, rotate)
  //   })
  // }

  const reInitialize = useCallback(() => {
    const resolution = new Vector2(
      window.innerWidth * window.devicePixelRatio,
      window.innerHeight * window.devicePixelRatio
    )
    const newData = keyframes.reInitialize(resolution)
    if (!isEqual(newData.curveCounts, lastData.curveCounts)) {
      console.log('reinit')

      setLastData(newData)
    } else {
      // updateChildren(newData)
    }
  }, [lastData])

  // useEffect(() => {
  //   updateChildren(lastData)
  // }, [lastData])

  // useEffect(() => {
  //   let timeout: number
  //   const reinit = () => {
  //     reInitialize()
  //     timeout = window.setTimeout(reinit, Math.random() ** 2 * 300)
  //   }
  //   reinit()
  //   return () => window.clearTimeout(timeout)
  // }, [])

  const arcLength = 1000 / lastData.settings.spacing
  const materials = useMemo(
    () =>
      groups.map(group => {
        const material = new SpriteNodeMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })

        const aspectRatio = screenSize.div(screenSize.x).toVar('screenSize')

        const curveEnds = uniformArray(group.curveEnds as any, 'int')
        const controlPointCounts = uniformArray(
          group.controlPointCounts as any,
          'int'
        )

        const curveIndexes = uniformArray(group.curveIndexes as any, 'int')
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

        const polyLine = ({ t, p0, p1, p2 }) => {
          return p0.mul(t.oneMinus()).add(p2.mul(t))
        }

        // Function to calculate a point on a Bezier curve
        const bezierPoint = ({ t, p0, p1, p2, strength }) => {
          const positionCurve = bezier2({ t, p0, p1, p2 })
          const positionStraight = polyLine({ t, p0, p1, p2 })
          const position = mix(
            positionCurve,
            positionStraight,
            pow(strength, 2)
          )
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
        const main = Fn(() => {
          const i = instanceIndex.div(arcLength)
          const curveI = curveIndexes.element(i)
          const curveProgress = float(curveI).add(0.5).div(dimensionsU.y)
          const t = instanceIndex
            .toFloat()
            .mod(arcLength)
            .div(arcLength)
            .toVar()
          const controlPointsCount = controlPointCounts.element(i)

          let point = {
            position: vec2(0, 0).toVar(),
            rotation: float(0).toVar()
          }

          If(controlPointsCount.equal(2), () => {
            const p0 = texture(keyframesTex, vec2(0, curveProgress)).xy
            const p1 = texture(
              keyframesTex,
              vec2(float(1).div(dimensionsU.x), curveProgress)
            ).xy
            const progressPoint = mix(p0, p1, t)
            point.position.assign(progressPoint)
            const rotation = lineTangent(p0, p1)
            point.rotation.assign(atan2(rotation.y, rotation.x))
            const textureVector = vec2(
              t.add(0.5).div(dimensionsU.x),
              curveProgress
            )
            varyingProperty('vec4', 'colorV').assign(
              texture(colorTex, textureVector)
            )
            thickness.assign(texture(thicknessTex, textureVector))
          }).Else(() => {
            const pointProgress = multiBezierProgress({
              t,
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
                t.mul(controlPointsCount.sub(1)).add(0.5).div(dimensionsU.x),
                curveProgress
              )
            const p0 = texture(keyframesTex, t0).xy.toVar('p0')
            const p1 = texture(keyframesTex, t1).xy.toVar('p1')
            const p2 = texture(keyframesTex, t2).xy.toVar('p2')
            let strength = float(p1.z)

            varyingProperty('vec4', 'colorV').assign(texture(colorTex, tt))
            thickness.assign(texture(thicknessTex, tt))

            If(pointProgress.x.greaterThan(float(0)), () => {
              p0.assign(mix(p0, p1, float(0.5)))
            })
            If(
              pointProgress.x.lessThan(float(controlPointsCount).sub(3)),
              () => {
                p2.assign(mix(p1, p2, 0.5))
              }
            )
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
        const pixel = float(1.414)
          .mul(2)
          .div(resolution.length())
          .mul(float(1.414).div(group.transform.scale.length()))
        material.scaleNode = vec2(thickness.mul(pixel), pixel)

        const vDirection = varying(vec4(), 'colorV')
        material.colorNode = vDirection

        return material
      }),
    []
  )
  console.log(lastData)

  // const resolution = uniform(vec2(0, 0))
  // const scaleCorrection = uniform(vec2(0, 0))
  // const progress = uniform(float(0))
  // const aspectRatio = vec2(1, resolution.y.div(resolution.x))
  // const pixel = vec2(1).div(resolution)
  // const rotate2d = Fn(({ v, angle }) => {
  //   const c = cos(angle)
  //   const s = sin(angle)
  //   return vec2(v.x.mul(c).sub(v.y.mul(s)), v.x.mul(s).add(v.y.mul(c)))
  // })
  // ROTATION
  // .add(
  //   rotate2d({
  //     v: position.xy.mul(pixel).mul(vec2(thickness)),
  //     angle: point.rotation.add(float(1.5707))
  //   })
  // )
  // .div(aspectRatio)
  // .div(scaleCorrection)

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
          count={arcLength * group.controlPointCounts.length}
          material={materials[i]}>
          <planeGeometry args={lastData.settings.defaults.size} />
        </instancedMesh>
      ))}
    </group>
  )
}
