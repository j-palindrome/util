import { ShaderNodeObject, texture, vec2, wgslFn } from 'three/tsl'
import { Node } from 'three/webgpu'

export const textureLoadFix = wgslFn<
  [texture: ReturnType<typeof texture>, ReturnType<typeof vec2>]
>(/*wgsl*/ `
fn textureLoadFix(tex: texture_2d<f32>, uv: vec2<i32>) -> vec4<f32> {
  return textureLoad(tex, uv, 0);
}`)

export const sampleFix = (
  texture: ShaderNodeObject<Node>,
  uvNode: ShaderNodeObject<Node>
) => {
  // @ts-expect-error
  return texture.sample(uvNode)
}
