import _, { range } from 'lodash'

export const bezier2Tangent = /*glsl*/ `
vec2 bezier2Tangent(float t, vec2 p0, vec2 p1, vec2 p2) {
  return 2.0 * (1.0 - t) * (p1 - p0) + 2.0 * t * (p2 - p1);
}`

export const bezier2 = /*glsl*/ `
vec2 bezier2(float t, vec2 p0, vec2 p1, vec2 p2) {
  float tInverse = 1. - t;
  return tInverse * tInverse * p0 
    + 2. * tInverse * t * p1 
    + t * t * p2;
}`

export const polyLine = /*glsl*/ `
float polyLine(float t, float p0, float p1, float p2) {
  float l0 = p1 - p0;
  float l1 = p2 - p1;
  float totalLength = l0 + l1;
  float progress = t * totalLength;
  if (progress > l0) {
    return mix(p1, p2, (progress - l0) / l1);
  } else {
    return mix(p0, p1, progress / l0);
  }
}

vec4 polyLine(float t, vec4 p0, vec4 p1, vec4 p2) {
  float l0 = distance(p0, p1);
  float l1 = distance(p1, p2);
  float totalLength = l0 + l1;
  float progress = t * totalLength;
  if (progress > l0) {
    return mix(p1, p2, (progress - l0) / l1);
  } else {
    return mix(p0, p1, progress / l0);
  }
}

vec2 polyLine(float t, vec2 p0, vec2 p1, vec2 p2) {
  float l0 = distance(p0, p1);
  float l1 = distance(p1, p2);
  float totalLength = l0 + l1;
  float progress = t * totalLength;
  if (progress > l0) {
    return mix(p1, p2, (progress - l0) / l1);
  } else {
    return mix(p0, p1, progress / l0);
  }
}
`

// export const lerpVectors = glsl `
// vec2 lerpVectors(vec2 a, vec2 b, float lerp) {
//   return a + (b - a) * lerp;
// }`

export const multiBezierProgressJS = (t: number, numPoints: number) => {
  const subdivisions = numPoints - 2
  return { t: (t * subdivisions) % 1, start: Math.floor(t * subdivisions) }
}
export const multiBezierProgress = /*glsl*/ `
vec2 multiBezierProgress (float t, int numPoints) {
  float subdivisions = float(numPoints - 2);
  // [0, 1, 2, 3, 4]: [0, 1, 2], [1, 2, 3], [2, 3, 4]: numPoints - degree
  int start = int(floor(t * subdivisions));
  float cycle = fract(t * subdivisions);
  return vec2(start, cycle);
}
`

export const bezierPoint = /*glsl*/ `
${bezier2}
${bezier2Tangent}
${polyLine}

struct BezierPoint {
  vec2 position;
  float rotation;
};

BezierPoint bezierPoint (float t, vec2 p0, vec2 p1, vec2 p2, float strength, vec2 aspectRatio) {
  vec2 positionCurve = bezier2(t, p0, p1, p2);
  vec2 positionStraight = polyLine(t, p0, p1, p2);
  vec2 position = mix(positionCurve, positionStraight, pow(strength, 2.));
  vec2 tangent = bezier2Tangent(t, p0, p1, p2) * aspectRatio;
  float rotation = atan(tangent.y, tangent.x);
  return BezierPoint(position, rotation);
}`
