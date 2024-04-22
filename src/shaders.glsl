vec2 bezierVertex(vec2 point, float dimension, float index, float t) {
  return index * t * pow((1.0 - t), dimension - index) * point;
}

bool isInCircle(vec2 point, vec2 center, float radius) {
  return length(point - center) < radius;
}