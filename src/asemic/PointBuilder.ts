import { Vector2 } from 'three'

export class PointBuilder extends Vector2 {
  strength?: CoordinateSettings['strength']
  color?: CoordinateSettings['color']
  alpha?: CoordinateSettings['alpha']
  thickness?: CoordinateSettings['thickness']

  constructor(
    point: [number, number] = [0, 0],
    { strength, color, alpha, thickness }: Partial<CoordinateSettings> = {}
  ) {
    super(point[0], point[1])
    this.strength = strength
    this.color = color
    this.alpha = alpha
    this.thickness = thickness
  }

  lerpRandom(point: Vector2) {
    const difference = point.clone().sub(this)
    this.randomize(difference)
    return this
  }

  randomize(point: Vector2) {
    this.add({
      x: point[0] * Math.random() - point[0] / 2,
      y: point[1] * Math.random() - point[1] / 2
    })
    return this
  }

  override clone() {
    return new PointBuilder([this.x, this.y]) as this
  }
}
