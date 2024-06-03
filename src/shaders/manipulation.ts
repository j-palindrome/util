// from https://gist.github.com/yiwenl/3f804e80d0930e34a0b33359259b556c

export const wrapAt1 = /*glsl*/ `
vec4 wrapAt1 (vec4 color) {
  if (color.r >= 0.999) color.r -= 1.0;
  else if (color.r <= 0.001) color.r += 1.0;
  if (color.g >= 0.999) color.g -= 1.0;
  else if (color.g <= 0.001) color.g += 1.0;
  if (color.b >= 0.999) color.b -= 1.0;
  else if (color.b <= 0.001) color.b += 1.0;
  if (color.a >= 0.999) color.a -= 1.0;
  else if (color.a <= 0.001) color.a += 1.0;
  return color;
}
`

export const flipY = /*glsl*/ `
vec2 flipY(vec2 uv) {
  return vec2(uv.x, 1.0 - uv.y);
}`

export const uvToCircle = /*glsl*/ `
vec2 uvToCircle(vec2 uv, vec2 center, float r) {
  float angle = uv.y * PI * 2.0;
  float radius = uv.x;
  return center + r * radius * vec2(sin(angle), cos(angle));
}`

export const rotate2d = /*glsl*/ `
vec2 rotate2d(vec2 v, float a) {
	float s = sin(a);
	float c = cos(a);
	mat2 m = mat2(c, s, -s, c);
	return m * v;
}`

export const rotate3d = /*glsl*/ `
mat4 rotationMatrix(vec3 axis, float angle) {
  axis = normalize(axis);
  float s = sin(angle);
  float c = cos(angle);
  float oc = 1.0 - c;
  
  return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
              oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
              oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
              0.0,                                0.0,                                0.0,                                1.0);
}

vec3 rotate(vec3 v, vec3 axis, float angle) {
mat4 m = rotationMatrix(axis, angle);
return (m * vec4(v, 1.0)).xyz;
}`
