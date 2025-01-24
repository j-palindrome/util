import {
  float,
  hash,
  NodeRepresentation,
  PI,
  PI2,
  range,
  sin,
  time,
  vec2,
  wgslFn
} from 'three/tsl'

export const simplex2D = wgslFn(/*wgsl*/ `
fn fract(x: f32) -> f32 {
  return x - floor(x);
}

fn wgslHash(ij: vec2<i32>) -> f32 {
  // Convert to float for hashing
  let x = f32(ij.x);
  let y = f32(ij.y);
  let h = x * 127.1 + y * 311.7;
  return fract(sin(h) * 43758.5453123);
}

fn randomGradient(ij: vec2<i32>) -> vec2<f32> {
  // Convert hash to angle in [0, 2π)
  let angle = 6.28318530718 * wgslHash(ij);
  return vec2<f32>(cos(angle), sin(angle));
}

fn cornerContribution(pos: vec2<f32>, ix: i32, iy: i32) -> f32 {
  // Radius term
  let t = 0.5 - dot(pos, pos);
  if t < 0.0 {
      return 0.0;
  }
  // Get pseudo-random gradient for this corner
  let grad = randomGradient(vec2<i32>(ix, iy));
  // Strength drops off near edges
  let t2 = t * t;
  // Dot the gradient with the offset, scale
  return t2 * t2 * dot(grad, pos);
}

fn snoise2D(v: vec2<f32>) -> f32 {
  // Skew/unskew constants for 2D
  let K = 0.3660254037844386;   // (sqrt(3)-1)/2
  let K2 = 0.211324865405187;   // (3 - sqrt(3))/6

  // Skew the input space
  let s = (v.x + v.y) * K;
  let i = floor(v.x + s);
  let j = floor(v.y + s);
  let t = (i + j) * K2;
  let X0 = i - t;
  let Y0 = j - t;
  let x0 = v.x - X0;
  let y0 = v.y - Y0;

  // Choose which triangle sub-cell we’re in
  let i1 = select<f32>(0.0, 1.0, x0 > y0);
  let j1 = select<f32>(1.0, 0.0, x0 > y0);

  // Offsets for middle corner
  let x1 = x0 - i1 + K2;
  let y1 = y0 - j1 + K2;
  // Offsets for last corner
  let x2 = x0 - 1.0 + 2.0 * K2;
  let y2 = y0 - 1.0 + 2.0 * K2;

  // Wrap corner indices
  let ii = i32(i) & 1023;  // mask as needed
  let jj = i32(j) & 1023;

  // Contributions from each of the three corners
  let n0 = cornerContribution(vec2<f32>(x0, y0), ii,           jj);
  let n1 = cornerContribution(vec2<f32>(x1, y1), ii + i32(i1), jj + i32(j1));
  let n2 = cornerContribution(vec2<f32>(x2, y2), ii + 1,       jj + 1);

  // Final noise value (scaled for better range)
  return 70.0 * (n0 + n1 + n2);
}`)

export const noiseWave = (...values: ReturnType<typeof vec2>[]) => {
  const output = float().toVar()
  for (let i = 0; i < values.length; i++) {
    output.addAssign(sin(values[i].x.mul(time)).mul(values[i].y))
  }
  return output.div(values.length)
}

export const noiseWaveRandom = (seed: number, freq: NodeRepresentation = 1) => {
  const output = float().toVar()
  const count = 10
  for (let i = 0; i < count; i++) {
    output.addAssign(
      sin(
        hash(
          float(seed)
            .mul(1000)
            .add(i * 10)
        )
          .mul(2)
          .mul(freq)
          .mul(time.mul(PI2))
          .mul(i + 1)
      ).div(i + 1)
    )
  }

  return output.div(2.92).add(1).div(2)
}
