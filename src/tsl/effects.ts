import { float, ShaderNodeObject, vec2 } from 'three/tsl'
import { Node, TextureNode } from 'three/webgpu'

export const quantize = (
  position: ShaderNodeObject<Node>,
  quantizeFactor: ReturnType<typeof float> | number
) => {
  return position.div(quantizeFactor).round().mul(quantizeFactor)
}

export const gaussianBlur = (
  texNode: ShaderNodeObject<TextureNode>,
  uv: ReturnType<typeof vec2>,
  blur: ReturnType<typeof vec2>
) => {
  const vuv = uv.toVar().div(blur).round().mul(blur)
  return texNode
    .sample(vuv)
    .add(texNode.sample(vuv.add(vec2(blur.x.negate(), blur.y))))
    .add(texNode.sample(vuv.add(vec2(0, blur.y))))
    .add(texNode.sample(vuv.add(vec2(blur.x, blur.y))))
    .add(texNode.sample(vuv.add(vec2(blur.x.negate(), 0))))
    .add(texNode.sample(vuv.add(vec2(blur.x, 0))))
    .add(texNode.sample(vuv.add(vec2(blur.x.negate(), blur.y.negate()))))
    .add(texNode.sample(vuv.add(vec2(0, blur.x.negate()))))
    .add(texNode.sample(vuv.add(vec2(blur.x, blur.x.negate()))))
    .div(9)
}
