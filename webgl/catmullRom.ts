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
  float splines = float(${
    points - 3
  }); // count only the starting points of splines (taking off the first, last, and endpoint)
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
