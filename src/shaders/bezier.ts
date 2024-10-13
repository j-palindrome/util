import _, { range } from 'lodash'
import { rotate2d } from './manipulation'
import { rad } from '../math'
import { PI } from './utilities'

export const arc = /*glsl*/ `
vec2 arc(float t, vec2 center, float r) {
  return center + vec2(sin(t), cos(t)) * r;
}`

export const lerp = /*glsl*/ `
vec2 lerp(float t, vec2 p0, vec2 p1) {
  return p0 + (p1 - p0) * t;
}`

export const bezier2 = /*glsl*/ `
${lerp}
vec2 bezier2(float t, vec2 p0, vec2 p1, vec2 p2) {
  return lerp(t, lerp(t, p0, p1), lerp(t, p1, p2));
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

// export const multiBezier3 = (numControlPoints: number) => / `
// int degree = 3;
// ${cubicBezier}
// vec2 multiBezier(float t, vec2[${numControlPoints}] points) {
//   int subdivisions = ${numControlPoints} - degree;
//   int start = int(floor(t * float(subdivisions)));
//   float cycle = fract(t * float(subdivisions));
//   return cubicBezier(
//     cycle,
//     points[start],
//     points[start + 1],
//     points[start + 2],
//     points[start + 3]);
// }
// `

// for points [0, 1, 2, 3, 4, 5, 6]: [0, 1, 2], then [2, 3, 4] then [4, 5, 6]
// for points [0, 1, 2, 3, 4, 5, 6, 7, 8]: [0, 1, 2], [2, 3, 4], [4, 5, 6], [6, 7, 8]: 1 + (numControlPoints - (degree + 1)) / degree = 6 / 2 = 3 + 1 = 6
// it's really [0, 1, 2] [1, 2, 3], [2, 3, 4], [3, 4, 5]
// or [0, 1, 2, 3], [2, 3, 4, 5]
// each bezier needs to switch to the next slowly...
export const multiBezier2 = (numPoints: number) => /*glsl*/ `
#define degree 2.
#define numPoints ${numPoints}
const float subdivisions = float(numPoints) / (degree - 1.);

${bezier2}
vec2 multiBezier2(float t, vec2[${numPoints}] points) {
  // 0...4 * 1 = 0, 1, 4, 6
  int start = int(floor(t * subdivisions) * (degree - 1.));
  float cycle = fract(t * subdivisions);
  return bezier2(
    cycle, 
    points[start], 
    points[start + 1], 
    points[start + 2]);
}
`
