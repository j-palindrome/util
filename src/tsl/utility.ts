import { texture, vec2, vec4, wgslFn } from 'three/tsl'

export const textureLoadFix = wgslFn<
  [ReturnType<typeof texture>, ReturnType<typeof vec2>]
>(/*wgsl*/ `
fn textureLoadFix(tex: texture_2d<f32>, uv: vec2<i32>) -> vec4<f32> {
  return textureLoad(tex, uv, 0);
}`)

// export const textureFix = wgslFn<
//   [ReturnType<typeof texture>, ReturnType<typeof vec2>]
// >(/*wgsl*/ `
// fn textureFix(tex: texture_2d<f32>, uv: vec2<i32>) -> vec4<f32> {
//   return textureLoad(tex, uv, 0);
// }`)

export const textureStoreFix = wgslFn<
  [ReturnType<typeof texture>, ReturnType<typeof vec2>, ReturnType<typeof vec4>]
>(/*wgsl*/ `
fn textureStoreFix(tex: texture_storage_2d<rgba32float, write>, uv: vec2<i32>, color: vec4<f32>) {
  textureStore(tex, uv, color);
}`)
