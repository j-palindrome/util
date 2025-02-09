import { add, float, Loop, screenSize, ShaderNodeObject, vec2 } from 'three/tsl'
import { Node, TextureNode } from 'three/webgpu'

export const quantize = (
  position: ShaderNodeObject<Node>,
  quantizeFactor: ReturnType<typeof float> | number
) => {
  return position.div(quantizeFactor).round().mul(quantizeFactor)
}

// export function gaussianBlur(
//   u_texture: ShaderNodeObject<TextureNode>,
//   vTexCoord: ReturnType<typeof vec2>,
//   radius = 10
// ) {
//   const blur = vec2(radius).div(screenSize)
//   const dir = vec2(1, 0)
//   const sum = add(
//     u_texture
//       .sample(
//         vec2(
//           vTexCoord.x.sub(
//             blur.mul(dir.x).mul(4.0),
//             vTexCoord.y.sub(blur.mul(dir.y).mul(4.0))
//           )
//         )
//       )
//       .mul(0.0162162162),
//     u_texture
//       .sample(
//         vec2(
//           vTexCoord.x.sub(
//             blur.mul(dir.x).mul(3.0),
//             vTexCoord.y.sub(blur.mul(dir.y).mul(3.0))
//           )
//         )
//       )
//       .mul(0.0540540541),
//     u_texture
//       .sample(
//         vec2(
//           vTexCoord.x.sub(
//             blur.mul(dir.x).mul(2.0),
//             vTexCoord.y.sub(blur.mul(dir.y).mul(2.0))
//           )
//         )
//       )
//       .mul(0.1216216216),
//     u_texture
//       .sample(
//         vec2(
//           vTexCoord.x.sub(
//             blur.mul(dir.x).mul(1.0),
//             vTexCoord.y.sub(blur.mul(dir.y).mul(1.0))
//           )
//         )
//       )
//       .mul(0.1945945946),
//     u_texture.sample(vec2(vTexCoord.x, vTexCoord.y)).mul(0.227027027),
//     u_texture
//       .sample(
//         vec2(
//           vTexCoord.x.add(
//             blur.mul(dir.x).mul(1.0),
//             vTexCoord.y.add(blur.mul(dir.y).mul(1.0))
//           )
//         )
//       )
//       .mul(0.1945945946),
//     u_texture
//       .sample(
//         vec2(
//           vTexCoord.x.add(
//             blur.mul(dir.x).mul(2.0),
//             vTexCoord.y.add(blur.mul(dir.y).mul(2.0))
//           )
//         )
//       )
//       .mul(0.1216216216),
//     u_texture
//       .sample(
//         vec2(
//           vTexCoord.x.add(
//             blur.mul(dir.x).mul(3.0),
//             vTexCoord.y.add(blur.mul(dir.y).mul(3.0))
//           )
//         )
//       )
//       .mul(0.0540540541),
//     u_texture
//       .sample(
//         vec2(
//           vTexCoord.x.add(
//             blur.mul(dir.x).mul(4.0),
//             vTexCoord.y.add(blur.mul(dir.y).mul(4.0))
//           )
//         )
//       )
//       .mul(0.0162162162)
//   )
//   return sum
// }
;`uniform sampler2D u_texture;
uniform float resolution;
uniform float radius;
uniform vec2 dir;

void main() {
    //this will be our RGBA sum
    vec4 sum = vec4(0.0);
    
    //our original texcoord for this fragment
    vec2 tc = vTexCoord;
    
    //the amount to blur, i.e. how far off center to sample from 
    //1.0 -> blur by one pixel
    //2.0 -> blur by two pixels, etc.
    float blur = radius/resolution; 
    
    //the direction of our blur
    //(1.0, 0.0) -> x-axis blur
    //(0.0, 1.0) -> y-axis blur
    float hstep = dir.x;
    float vstep = dir.y;
    
    //apply blurring, using a 9-tap filter with predefined gaussian weights
    
    sum += texture2D(u_texture, vec2(tc.x - 4.0*blur*hstep, tc.y - 4.0*blur*vstep)) * 0.0162162162;
    sum += texture2D(u_texture, vec2(tc.x - 3.0*blur*hstep, tc.y - 3.0*blur*vstep)) * 0.0540540541;
    sum += texture2D(u_texture, vec2(tc.x - 2.0*blur*hstep, tc.y - 2.0*blur*vstep)) * 0.1216216216;
    sum += texture2D(u_texture, vec2(tc.x - 1.0*blur*hstep, tc.y - 1.0*blur*vstep)) * 0.1945945946;
    
    sum += texture2D(u_texture, vec2(tc.x, tc.y)) * 0.2270270270;
    
    sum += texture2D(u_texture, vec2(tc.x + 1.0*blur*hstep, tc.y + 1.0*blur*vstep)) * 0.1945945946;
    sum += texture2D(u_texture, vec2(tc.x + 2.0*blur*hstep, tc.y + 2.0*blur*vstep)) * 0.1216216216;
    sum += texture2D(u_texture, vec2(tc.x + 3.0*blur*hstep, tc.y + 3.0*blur*vstep)) * 0.0540540541;
    sum += texture2D(u_texture, vec2(tc.x + 4.0*blur*hstep, tc.y + 4.0*blur*vstep)) * 0.0162162162;

    gl_FragColor = vColor * sum;
}`
export const gaussianBlur = (
  texNode: ShaderNodeObject<TextureNode>,
  uv: ReturnType<typeof vec2>,
  blur: ReturnType<typeof vec2>
) => {
  const thisBlur = blur.div(screenSize).toVar()
  // const vuv = uv.toVar().div(thisBlur).round().mul(thisBlur)
  const vuv = uv.toVar()
  return texNode.sample(vuv).add(
    texNode
      .sample(vuv.add(vec2(thisBlur.x.negate(), thisBlur.y)))
      .add(texNode.sample(vuv.add(vec2(0, thisBlur.y))))
      .add(texNode.sample(vuv.add(vec2(thisBlur.x, thisBlur.y))))
      .add(texNode.sample(vuv.add(vec2(thisBlur.x.negate(), 0))))
      .add(texNode.sample(vuv.add(vec2(thisBlur.x, 0))))
      .add(
        texNode.sample(vuv.add(vec2(thisBlur.x.negate(), thisBlur.y.negate())))
      )
      .add(texNode.sample(vuv.add(vec2(0, thisBlur.x.negate()))))
      .add(texNode.sample(vuv.add(vec2(thisBlur.x, thisBlur.x.negate()))))
    // .mul(float(0.5).pow(float(i)))
  )
  // thisBlur.addAssign(vec2(1, 1).div(screenSize))

  // return sample
  //   .add(texNode.sample(vuv.add(vec2(thisBlur.x.negate(), thisBlur.y))))
  //   .add(texNode.sample(vuv.add(vec2(0, thisBlur.y))))
  //   .add(texNode.sample(vuv.add(vec2(thisBlur.x, thisBlur.y))))
  //   .add(texNode.sample(vuv.add(vec2(thisBlur.x.negate(), 0))))
  //   .add(texNode.sample(vuv.add(vec2(thisBlur.x, 0))))
  //   .add(
  //     texNode.sample(vuv.add(vec2(thisBlur.x.negate(), thisBlur.y.negate())))
  //   )
  //   .add(texNode.sample(vuv.add(vec2(0, thisBlur.x.negate()))))
  //   .add(texNode.sample(vuv.add(vec2(thisBlur.x, thisBlur.x.negate()))))
}
