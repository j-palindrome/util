import _ from 'lodash'
import { rotate2d } from './shaders/manipulation'
import { rad } from './math'
import { PI } from './shaders/utilities'

// B(t) = (1 - t)^2 * (P0 - P1) + t^2 * (P2 - P1) for 0 <= t <= 1
export const quadraticBezier = /*glsl*/ `
vec2 quadraticBezier(float t, vec2 p0, vec2 p1, vec2 p2) {
  return pow(1.0 - t, 2.0) * (p0 - p1) + pow(t, 2.0) * (p2 - p1);
}`

export const cubicBezierNormal = /*glsl*/ `
${rotate2d}
vec2 cubicBezierNormal(float t, vec2 p0, vec2 p1, vec2 p2, vec2 p3) {
  vec2 normal = pow(1.0 - t, 2.0) * (p1 - p0) + 2.0 * t * (1.0 - t) * (p2 - p1) + pow(t, 2.0) * (p3 - p2);
  return normalize(rotate2d(normal, 3.141592653589793 * 0.5));
}`

// export const cubicBezierCurvature = /*glsl*/ `
// vec2 cubicBezierCurvature(float t, vec2 p0, vec2 p1, vec2 p2, vec2 p3) {
//   vec2 curvature = 2.0 * (1.0 - t) * (p0 - p1) + 2.0 * (t - 1.0) * (p1 - p2) + 2.0 * t * (p1 - p2) - 2.0 * t * (p2 - p3);
//   return curvature;
// }
// `

export const cubicBezier = /*glsl*/ `
vec2 cubicBezier(float t, vec2 p0, vec2 p1, vec2 p2, vec2 p3) {
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

const printBinomialCoefficient = (n: number, k: number) => {
  let topLevel = n
  for (let i = n - 1; i >= n - k + 1; i--) {
    topLevel *= i
  }
  let bottomLevel = k
  for (let i = k - 1; i >= 1; i--) {
    bottomLevel *= i
  }
  return topLevel / bottomLevel
}
const printBezierPortion = (i: number, n: number, point: [number, number]) => {
  let coefficient = 1.0
  if (i > 0 && i < n) {
    coefficient = printBinomialCoefficient(n, i)
  }
  return `[${coefficient} * (t ** ${i}) * (1 - t) ** ${n - i}]`
}
export const printBezier = (points: [number, number][]) => {
  let printedPoints: string[] = []
  for (let i = 0; i <= points.length; i++) {
    printedPoints.push(printBezierPortion(i, points.length, points[i]))
  }
  return printedPoints.join(' + ')
}

// from https://qroph.github.io/2018/07/30/smooth-paths-using-catmull-rom-splines.html
export const catmullRomSpline = /*glsl*/ `
vec2 catmullRomSpline(float t, vec2 p0, vec2 p1, vec2 p2, vec2 p3) {
  float t01 = pow(distance(p0, p1), 0.5);
  float t12 = pow(distance(p1, p2), 0.5);
  float t23 = pow(distance(p2, p3), 0.5);
  
  vec2 m1 = (p2 - p1 + t12 * ((p1 - p0) / t01 - (p2 - p0) / (t01 + t12)));
  vec2 m2 = (p2 - p1 + t12 * ((p3 - p2) / t23 - (p3 - p1) / (t12 + t23)));

  vec2 a = 2.0f * (p1 - p2) + m1 + m2;
  vec2 b = -3.0f * (p1 - p2) - m1 - m1 - m2;
  vec2 c = m1;
  vec2 d = p1;

  vec2 point = a * t * t * t +
    b * t * t +
    c * t +
    d;
  
  return point;
}`

export const catmullRomCurve = (points: number) => /*glsl*/ `
${catmullRomSpline}
struct PointInterpolation {
  int startIndex;
  float t;
};
PointInterpolation getPointInterpolation(float t, vec2 points[${points}]) {
  float splines = float(${points - 3}); // count only the starting points of splines (taking off the first, last, and endpoint)
  float mappedT = floor(t * splines);
  float progress = t * splines - mappedT;
  // whichever lengths work, return that
  return PointInterpolation (
    int(mappedT) + 1,
    progress
  );
}
vec2 catmullRomCurve(float t, vec2 points[${points}]) {
  PointInterpolation interpolation = getPointInterpolation(t, points);
  return catmullRomSpline(interpolation.t, points[interpolation.startIndex - 1], points[interpolation.startIndex], points[interpolation.startIndex + 1], points[interpolation.startIndex + 2]);
  // return vec2(points[interpolation.startIndex].x, interpolation.t);
}`
