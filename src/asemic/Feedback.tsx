import {
  screenSize,
  screenUV,
  ShaderNodeObject,
  storageTexture,
  texture,
  textureLoad,
  textureStore,
  uv,
  uvec2,
  vec2,
  vec4
} from 'three/tsl'
import {
  FloatType,
  NodeAccess,
  StorageTexture,
  TextureNode
} from 'three/webgpu'
import { sampleFix, textureLoadFix } from '../tsl/utility'
import invariant from 'tiny-invariant'

export default class Feedback {
  feedbackTex: StorageTexture
  readbackTex: StorageTexture
  feedbackU?: ShaderNodeObject<TextureNode>
  readbackU?: ShaderNodeObject<TextureNode>

  update() {
    invariant(this.feedbackU && this.readbackU)
    const temp = this.readbackU.value
    this.feedbackU.value = this.readbackU.value
    this.readbackU.value = temp
  }

  feedback(valueNode) {
    this.feedbackU = textureStore(
      this.feedbackTex,
      uvec2(screenUV.mul(screenSize)),
      vec4(valueNode)
    ).toWriteOnly()
  }

  readback() {
    this.readbackU = sampleFix(
      textureStore(this.readbackTex).toReadOnly(),
      uv()
    )
    return this.readbackU!
  }

  constructor(width: number, height: number) {
    this.feedbackTex = new StorageTexture(width, height)
    this.readbackTex = new StorageTexture(width, height)
    this.feedbackTex.type = FloatType
    this.readbackTex.type = FloatType
  }
}
