export const positionToUv = /*glsl*/ `
vec2 positionToUv(vec2 pos) {
  return (pos + 1.0) * 0.5;
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

export const glslEs300 = /*glsl*/ `#version 300 es
precision highp float;
`

export const fixGlslify = (input: string) => {
  return input.replace(/^#pragma glslify: .*$/gm, '')
}
