import { Color, Vector2 } from 'three'
import { defaultCoordinateSettings } from './Builder'

export default class PointBuilder extends Vector2 {
  strength: CoordinateSettings['strength'] = defaultCoordinateSettings.strength
  color: [number, number, number] =
    defaultCoordinateSettings.color as unknown as [number, number, number]
  alpha: CoordinateSettings['alpha'] = defaultCoordinateSettings.alpha
  thickness: CoordinateSettings['thickness'] =
    defaultCoordinateSettings.thickness

  constructor(
    point: [number, number] | Vector2 = [0, 0],
    settings: Partial<CoordinateSettings> = defaultCoordinateSettings
  ) {
    super(
      ...(point instanceof Vector2 ? [point.x, point.y] : [point[0], point[1]])
    )
    Object.assign(this, settings)
    if (settings.color instanceof Color)
      this.color = [settings.color.r, settings.color.g, settings.color.b]
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
    return new PointBuilder([this.x, this.y], this) as this
  }
}
