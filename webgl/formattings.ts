import { rotate2d } from './manipulation'

export const arc = /*glsl*/ `
vec2 arc(float t, vec2 center, float r) {
  return center + vec2(sin(t), cos(t)) * r;
}`

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

export const bezier3Normal = /*glsl*/ `
${rotate2d}
vec2 bezier3Normal(float t, vec2 points[4]) {
  vec2 normal = pow(1.0 - t, 2.0) * (points[1] - points[0]) + 2.0 * t * (1.0 - t) * (points[2] - points[1]) + pow(t, 2.0) * (points[3] - points[2]);
  return normalize(rotate2d(normal, 3.141592653589793 * 0.5));
}`

export const bezier3 = /*glsl*/ `
vec2 bezier3(float t, vec2 p0, vec2 p1, vec2 p2, vec2 p3) {
  return pow(1.0 - t, 3.0) * p0
    + 3.0 * pow(1.0 - t, 2.0) * t * p1
    + 3.0 * (1.0 - t) * pow(t, 2.0) * p2
    + pow(t, 3.0) * p3;
}`

// https://en.wikipedia.org/wiki/Binomial_coefficient
export const binomialCoefficient = /*glsl*/ `
float binomialCoefficient(int n, int k) {
  int topLevel = n;
  for (int i = n - 1; i >= n - k + 1; i --) {
    topLevel *= i;
  }
  int bottomLevel = k;
  for (int i = k - 1; i >= 1; i --) {
    bottomLevel *= i;
  }
  return float(topLevel) / float(bottomLevel);
}`

export const bezierPortion = /*glsl*/ `
${binomialCoefficient}
vec2 bezierPortion(float t, int i, int n, vec2 point) {
  float coefficient = 1.0;
  if (i > 0 && i < n) {
    coefficient = binomialCoefficient(n, i);
  }
  return coefficient * pow(t, float(i)) * pow((1.0 - t), float(n - i)) * point;
}`

// degree 5 needs 6 control points
// https://en.wikipedia.org/wiki/Bézier_curve
export const bezierN = (degree: number) => /*glsl*/ `
${bezierPortion}
vec2 bezierN(float t, vec2 points[${degree + 1}]) {
  vec2 endPoint = vec2(0.0, 0.0);
  for (int i = 0; i <= ${degree}; i ++) {
    endPoint += bezierPortion(t, i, ${degree}, points[i]);
  }
  return endPoint;
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
