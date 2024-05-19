export function shape(type: 'square') {
  const sourceTypes = {
    square: [-1, 1, 1, 1, -1, -1, -1, -1, 1, 1, 1, -1]
  }
  return sourceTypes[type]
}

export function polToCar(r: number, theta: number) {
  theta = Math.PI * 2 * theta
  return [r * Math.sin(theta), r * Math.cos(theta)]
}

export function ellipse(rx: number, ry: number, theta: number) {
  theta = Math.PI * 2 * theta
  return [rx * Math.sin(theta), ry * Math.cos(theta)]
}
