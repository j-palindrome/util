export const toES300 = (shader: string) => {
  return shader
    .replace(/^ *precision.*/gm, '')
    .replace(/varying/g, 'in')
    .replace(/gl_FragColor/g, 'fragColor')
    .replace(/texture2D/g, 'texture')
}

export const uvToPosition = /*glsl*/ `
vec4 uvToPosition(vec2 uv) {
  return vec4(uv * 2.0 - 1.0, 0, 1);
}`

export const PI = /*glsl*/ `
#define PI 3.141592653589793`

export const positionToUv = /*glsl*/ `
vec2 positionToUv(vec2 pos) {
  return vec2(pos.x + 1.0, pos.y + 1.0) / 2.0;
}`

export const positionToNorm = /*glsl*/ `
vec2 positionToNorm(vec2 pos) {
  return (pos + 1.0) / 2.0;
}`

export const normToPosition = /*glsl*/ `
vec2 normToPosition(vec2 pos) {
  return pos * 2.0 - 1.0;
}`

export const wrapUv = /*glsl*/ `
vec2 wrapUv(vec2 pos) {
  if (pos.x < 0.0) pos.x += 1.0;
  else if (pos.x > 1.0) pos.x -= 1.0;
  if (pos.y < 0.0) pos.y += 1.0;
  else if (pos.y > 1.0) pos.y -= 1.0;
  return pos;
}
`
export const wrapPosition = /*glsl*/ `
${positionToNorm}
${normToPosition}
vec2 wrapPosition(vec2 pos) {
  return normToPosition(mod(positionToNorm(pos), 1.0));
}`

export const defaultVert2D = /*glsl*/ `
uniform vec2 resolution;
in vec2 position;
out vec2 uv;
${positionToUv}
void main() {
  gl_Position = vec4(position.x * (resolution.y / resolution.x), position.y, 0, 1);
  uv = positionToUv(position);
}`

export const defaultVert2DNoResolution = /*glsl*/ `
in vec2 position;
out vec2 uv;
${positionToUv}
void main() {
  uv = positionToUv(position);
  gl_Position = vec4(position.x, position.y, 0, 1);
}`

export const defaultVert2DLegacy = /*glsl*/ `
attribute vec2 position;
varying vec2 uv;
${positionToUv}
void main() {
  gl_Position = vec4(position, 0, 1);
  uv = positionToUv(position);
}`

export const defaultFragColor = (r = 1, g = 1, b = 1, a = 1) => /*glsl*/ `
void main() {
  fragColor = vec4(${r}, ${g}, ${b}, ${a});
}`

export const defaultFragColorLegacy = (r = 1, g = 1, b = 1, a = 1) => /*glsl*/ `
void main() {
  gl_FragColor = vec4(${r}, ${g}, ${b}, ${a});
}`

export const defaultFragSource = (name: string) => /*glsl*/ `
uniform sampler2D ${name};
void main() {
  fragColor = texture(${name}, uv);
}`

export const glslEs300 = /*glsl*/ `#version 300 es
precision highp float;
`

export const fixGlslify = (input: string) => {
  return input.replace(/^#pragma glslify: .*$/gm, '')
}
