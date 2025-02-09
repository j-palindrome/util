import {
  screenSize,
  ShaderNodeObject,
  texture,
  vec2,
  vec4,
  wgslFn
} from 'three/tsl'
import {
  Node,
  Renderer,
  RenderTarget,
  Texture,
  TextureNode
} from 'three/webgpu'

export const textureLoadFix = wgslFn<
  [texture: ReturnType<typeof texture>, ReturnType<typeof vec2>]
>(/*wgsl*/ `
fn textureLoadFix(tex: texture_2d<f32>, uv: vec2<i32>) -> vec4<f32> {
  return textureLoad(tex, uv, 0);
}`)

export const textureStoreFix = wgslFn<
  [
    texture: ReturnType<typeof texture>,
    ReturnType<typeof vec2>,
    value: ReturnType<typeof vec4>
  ]
>(/*wgsl*/ `
fn textureStoreFix(tex: texture_2d<f32, write>, uv: vec2<i32>, value: vec4<f32>) {
  textureStore(tex, uv, value);
}`)

export const sampleFix = (
  texture: ShaderNodeObject<TextureNode>,
  uvNode: ShaderNodeObject<Node>
) => {
  // @ts-expect-error
  return texture.sample(uvNode) as ShaderNodeObject<TextureNode>
}

export const gradFix = (
  texture: ShaderNodeObject<Node>,
  xNode: ShaderNodeObject<Node>,
  yNode: ShaderNodeObject<Node>
) => {
  // @ts-expect-error
  return texture.grad(xNode, yNode) as ShaderNodeObject<TextureNode>
}

export const logTexture = async (renderer: Renderer, texture: RenderTarget) => {
  console.log(
    await renderer.readRenderTargetPixelsAsync(
      texture,
      0,
      0,
      texture.width,
      texture.height
    )
  )
}

export const height = screenSize.y.div(screenSize.x)
export const dimensions = screenSize.div(screenSize.x)
