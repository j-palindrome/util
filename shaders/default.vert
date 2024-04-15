#version 300 es
precision mediump float;

in vec2 position;

void main() {
  gl_Position = vec4(position, 0.0f, 1.0f);
}