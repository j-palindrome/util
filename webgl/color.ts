export const rgb2hsl = /*glsl*/ `
vec4 rgb2hsl(vec4 rgb) {
  float minColor = min(rgb.r, min(rgb.g, rgb.b));
  float maxColor = max(rgb.r, max(rgb.g, rgb.b));
  float luminance = (minColor + maxColor) / 2.0;
  float saturation;
  if (luminance < 0.5) {
    saturation = (maxColor - minColor) / (maxColor + minColor);
  } else {
    saturation = (maxColor - minColor) / (2.0 - maxColor - minColor);
  }
  float hue;
  if (rgb.r == maxColor) {
    hue = (rgb.g - rgb.b) / (maxColor - minColor);
  } else if (rgb.g == maxColor) {
    hue = 2.0 + (rgb.b - rgb.r) / (maxColor - minColor);
  } else {
    hue = 4.0 + (rgb.r - rgb.g) / (maxColor - minColor);
  }
  if (hue < 0.0) hue += 1.0;
}`

export const luma = /*glsl*/ `
float luma(vec4 color) {
  return ((color.r + color.g + color.b) / 3.0) * color.a;
}`
