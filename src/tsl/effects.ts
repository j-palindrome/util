import { vec2 } from 'three/tsl'

export const gaussianBlur = (texNode, uv, blur) => {
  const vuv = uv.toVar().div(blur).round().mul(blur)
  return texNode
    .sample(vuv)
    .add(texNode.sample(vuv.add(vec2(blur.negate(), blur))))
    .add(texNode.sample(vuv.add(vec2(0, blur))))
    .add(texNode.sample(vuv.add(vec2(blur, blur))))
    .add(texNode.sample(vuv.add(vec2(blur.negate(), 0))))
    .add(texNode.sample(vuv.add(vec2(blur, 0))))
    .add(texNode.sample(vuv.add(vec2(blur.negate(), blur.negate()))))
    .add(texNode.sample(vuv.add(vec2(0, blur.negate()))))
    .add(texNode.sample(vuv.add(vec2(blur, blur.negate()))))
    .div(9)
}
