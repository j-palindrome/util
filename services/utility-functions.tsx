import { Color } from '@/sanity.types'
import { useEffect } from 'react'

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

export const useEventListener = <K extends keyof WindowEventMap>(
  listener: K,
  func: (data: WindowEventMap[K]) => void,
  dependencies: any[] = []
) => {
  useEffect(() => {
    window.addEventListener(listener, func)
    return () => window.removeEventListener(listener, func)
  }, dependencies)
}
