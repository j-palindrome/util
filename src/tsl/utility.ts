import { texture, vec2, wgslFn } from 'three/tsl'

export const textureLoadFix = wgslFn<
  [texture: ReturnType<typeof texture>, ReturnType<typeof vec2>]
>(/*wgsl*/ `
fn loadTexture(tex: texture_2d<f32>, uv: vec2<i32>) -> vec4<f32> {
  return textureLoad(tex, uv, 0);
}`)
