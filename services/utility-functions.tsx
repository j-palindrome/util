import { Color } from '@/sanity.types'
import _ from 'lodash'

export const formatColor = (color: Color) =>
  `${color.rgb?.r} ${color.rgb?.g} ${color.rgb?.b}`

export const defaultFragColor = (r = 1, g = 1, b = 1, a = 1) => /*glsl*/ `
void main() {
  fragColor = vec4(${r}, ${g}, ${b}, ${a});
}`

export const glslEs300 = /*glsl*/ `#version 300 es
precision highp float;
`

export const positionToUv = /*glsl*/ `
vec2 positionToUv(vec2 pos) {
  return vec2(pos.x + 1.0, pos.y + 1.0) / 2.0;
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

export const defaultFragColorLegacy = (r = 1, g = 1, b = 1, a = 1) => /*glsl*/ `
void main() {
  gl_FragColor = vec4(${r}, ${g}, ${b}, ${a});
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

export function shape(type: 'square') {
  const sourceTypes = {
    square: [-1, 1, 1, 1, -1, -1, -1, -1, 1, 1, 1, -1]
  }
  return sourceTypes[type]
}

const charFrequency = {
  a: 0.082,
  b: 0.015,
  c: 0.028,
  d: 0.043,
  e: 0.127,
  f: 0.022,
  g: 0.02,
  h: 0.061,
  i: 0.07,
  j: 0.015,
  k: 0.077,
  l: 0.04,
  m: 0.024,
  n: 0.067,
  o: 0.075,
  p: 0.019,
  q: 0.001,
  r: 0.06,
  s: 0.063,
  t: 0.091,
  u: 0.028,
  v: 0.01,
  w: 0.024,
  x: 0.015,
  y: 0.02,
  z: 0.008
}

export const generateRandomString = (length: number) => {
  let str: string[] = []
  const charThresholds: { letter: string; threshold: number }[] = []
  let total = 0
  for (let [letter, prob] of Object.entries(charFrequency)) {
    total += prob
    charThresholds.push({ letter, threshold: total })
  }
  const thresholds = _.sortBy(charThresholds, 'threshold')

  while (str.length < length) {
    const wordLength = _.random(7)
    let seed: number
    for (let i = 0; i < wordLength; i++) {
      seed = Math.random()
      const letter = thresholds.find(char => char.threshold > seed)!.letter
      str.push(letter)
    }
    str.push(' ')
  }
  return str.join('')
}
