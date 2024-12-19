import { bezierPoint, multiBezierProgress } from './bezier'
import { isEqual, now } from 'lodash'
import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import * as THREE from 'three'
import { Vector2 } from 'three'
import Builder from './Builder'
import { rotate2d, useEventListener } from './util'

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
  const keyframes = useMemo(() => new Builder(render), [render])

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

  const { modifyIncludes, modifyPosition, modifyColor } = settings
  const meshRef = useRef<THREE.Group>(null!)
  const maxCurveLength = resolution.length() * 2

  const updateChildren = (newData: typeof lastData) => {
    if (!meshRef.current) return
    meshRef.current.rotation.set(0, 0, newData.transform.rotate)
    meshRef.current.scale.set(...newData.transform.scale.toArray(), 1)
    meshRef.current.position.set(...newData.transform.translate.toArray(), 0)

    meshRef.current.children.forEach((c, i) => {
      const child = c as THREE.InstancedMesh<
        THREE.PlaneGeometry,
        THREE.ShaderMaterial
      >
      if (!newData.groups[i]) return
      child.material.uniforms.keyframesTex.value = newData.keyframesTex
      child.material.uniforms.colorTex.value = newData.colorTex
      child.material.uniforms.thicknessTex.value = newData.thicknessTex
      child.material.uniforms.curveEnds.value = newData.groups[i].curveEnds
      child.material.uniforms.curveIndexes.value =
        newData.groups[i].curveIndexes
      child.material.uniforms.controlPointCounts.value =
        newData.groups[i].controlPointCounts

      child.material.uniforms.resolution.value = resolution
      child.material.uniforms.dimensions.value = newData.dimensions
      child.count = newData.groups[i].totalCurveLength
      child.material.uniformsNeedUpdate = true

      const { translate, scale, rotate } = newData.groups[i].transform
      child.material.uniforms.scaleCorrection.value = scale
      child.position.set(translate.x, translate.y, 0)
      child.scale.set(scale.x, scale.y, 1)
      child.rotation.set(0, 0, rotate)
    })
  }

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
      updateChildren(newData)
    }
  }, [lastData])

  useEffect(() => {
    updateChildren(lastData)
  }, [lastData])

  useEffect(() => {
    let timeout: number
    const reinit = () => {
      reInitialize()
      timeout = window.setTimeout(reinit, Math.random() ** 2 * 300)
    }
    reinit()
    return () => window.clearTimeout(timeout)
  }, [])

  return (
    <group
      ref={meshRef}
      scale={[...transform.scale.toArray(), 1]}
      rotation={[0, 0, transform.rotate]}
      position={[...transform.translate.toArray(), 0]}>
      {groups.map((group, i) => (
        <instancedMesh
          position={[...group.transform.translate.toArray(), 0]}
          scale={[...group.transform.scale.toArray(), 1]}
          rotation={[0, 0, group.transform.rotate]}
          key={i + now()}
          args={[undefined, undefined, maxCurveLength]}>
          <planeGeometry args={lastData.settings.defaults.size} />
          <shaderMaterial
            transparent
            uniforms={{
              colorTex: { value: colorTex },
              thicknessTex: { value: thicknessTex },
              keyframesTex: { value: keyframesTex },
              resolution: { value: resolution },
              progress: { value: 0 },
              dimensions: { value: dimensions },
              curveEnds: { value: group.curveEnds },
              curveIndexes: { value: group.curveIndexes },
              controlPointCounts: { value: group.controlPointCounts },
              scaleCorrection: { value: group.transform.scale }
            }}
            vertexShader={
              /*glsl*/ `
uniform int curveEnds[${group.curveEnds.length}];
uniform int controlPointCounts[${group.controlPointCounts.length}];
uniform int curveIndexes[${group.curveIndexes.length}];
uniform sampler2D keyframesTex;
uniform sampler2D colorTex;
uniform sampler2D thicknessTex;
uniform vec2 dimensions;
uniform vec2 resolution;
uniform vec2 scaleCorrection;
uniform float progress;

out vec2 vUv;
out vec4 vColor;
out float v_test;

${bezierPoint}
${multiBezierProgress}
${rotate2d}
${modifyIncludes}
vec2 modifyPosition(
  vec2 position, 
  float progress, 
  float pointProgress, 
  float curveProgress) {
  ${modifyPosition}
}

void main() {
  vec2 aspectRatio = vec2(1, resolution.y / resolution.x);
  vec2 pixel = vec2(1. / resolution.x, 1. / resolution.y);

  int id = gl_InstanceID;
  int curveIndex = 0;
  while (id > curveEnds[curveIndex]) {
    if (curveIndex >= curveEnds.length()) {
      break;
    }
    curveIndex ++;
  }

  float curveProgress = float(curveIndexes[curveIndex]) / dimensions.y;
  int controlPointsCount = controlPointCounts[curveIndex];

  float pointProgress;
  if (curveIndex > 0) {
    pointProgress = float(id - curveEnds[curveIndex - 1]) 
      / float(curveEnds[curveIndex] - curveEnds[curveIndex - 1]);
  } else {
    pointProgress = float(id) / float(curveEnds[curveIndex]);
  }

  BezierPoint point;
  float thickness;
  vec4 color;
  if (controlPointsCount == 2) {
    vec2 p0 = texture(keyframesTex, vec2(0, curveProgress)).xy;
    vec2 p1 = texture(keyframesTex, vec2(
      1. / dimensions.x, curveProgress)).xy;
    vec2 progressPoint = mix(p0, p1, pointProgress);
    point = BezierPoint(progressPoint,
      atan(progressPoint.y, progressPoint.x));
    float t0 = texture(thicknessTex, vec2(0, curveProgress)).x;
    float t1 = texture(thicknessTex, vec2(
      1. / dimensions.x, curveProgress)).x;
    thickness = mix(t0, t1, pointProgress);
    vec4 c0 = texture(colorTex, vec2(0, curveProgress));
    vec4 c1 = texture(colorTex, vec2(
      1. / dimensions.x, curveProgress));
    color = mix(c0, c1, pointProgress);
  } else {
    vec2 pointCurveProgress = 
      multiBezierProgress(pointProgress, controlPointsCount);
    vec2 points[3];
    vec4 colors[3];
    float thicknesses[3];

    float strength;
    
    for (int pointI = 0; pointI < 3; pointI ++) {
      vec2 textureVec = vec2(
        (pointCurveProgress.x + float(pointI)) 
          / dimensions.x,
        curveProgress);
      vec4 samp = texture(keyframesTex, textureVec);
      if (pointI == 1) {
        strength = samp.z;
        thickness = texture(thicknessTex, textureVec).x;
      }
      points[pointI] = samp.xy;
      colors[pointI] = texture(colorTex, textureVec);
    }

    // adjust to interpolate between things
    if (pointCurveProgress.x > 0.) {
      points[0] = mix(points[0], points[1], 0.5);
    }
    if (pointCurveProgress.x < float(controlPointsCount) - 3.) {
      points[2] = mix(points[1], points[2], 0.5);
    }
    point = bezierPoint(pointCurveProgress.y, 
      points[0], points[1], points[2], strength, vec2(1, 1));
    color = polyLine(pointCurveProgress.y, 
      colors[0], colors[1], colors[2]);
  }

  vColor = color;

  gl_Position = 
    projectionMatrix 
    * modelViewMatrix 
    * vec4(modifyPosition(
        point.position,
        progress,
        pointProgress,
        curveProgress)
      + rotate2d(
        position.xy * pixel
        * vec2(thickness), 
        point.rotation + 1.5707) 
        / aspectRatio 
        / scaleCorrection,
      0, 1);
}
`
            }
            fragmentShader={
              /*glsl*/ `
uniform vec2 resolution;
in vec2 vUv;
in vec4 vColor;
in float v_test;
// flat in int vDiscard;

vec4 processColor (vec4 color, vec2 uv) {
  ${modifyColor}
}
void main() {
  // if (vDiscard == 1) discard;
  gl_FragColor = processColor(vColor, vUv);
  // gl_FragColor = processColor(vec4(v_test, 1,1,1), vUv);
}`
            }
          />
        </instancedMesh>
      ))}
    </group>
  )
}
