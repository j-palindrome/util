import { cos, PI, ShaderNodeObject } from 'three/tsl'
import { Node } from 'three/webgpu'

export const easeInOutSine = (input: ShaderNodeObject<Node>) =>
  cos(input.mul(PI)).sub(1).mul(-1).div(2)
