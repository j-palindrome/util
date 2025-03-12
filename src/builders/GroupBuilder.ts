import _, { entries, last, max, min, range } from 'lodash'
import { Vector2 } from 'three'
import { lerp } from 'three/src/math/MathUtils.js'
import { mrt, output } from 'three/tsl'
import invariant from 'tiny-invariant'
import Builder from './Builder'
import PointBuilder from './PointBuilder'
import { FontBuilder } from './FontBuilder'
import { DefaultFont } from '../fonts/DefaultFont'
import { multiBezierJS } from '../util/bezier'

export default class GroupBuilder extends Builder {
  time: number = performance.now() / 1000
  h: number
  size = new Vector2()
  curves: PointBuilder[][] = []
  lastIndex: number = 0
  onInit: (g: GroupBuilder) => any
  font: FontBuilder = new DefaultFont()
  getAlongCache: Record<string, Vector2> = {}

  setFont(font: FontBuilder) {
    this.font = font
    return this
  }

  getAlongCached(t: number, thisCurve: number) {
    if (thisCurve < 0) thisCurve += this.curves.length
    const key = `${thisCurve}:${t.toFixed(2)}`
    if (this.getAlongCache[key]) {
      return this.getAlongCache[key]
    } else {
      const result = this.getAlong(t, ...this.curves[thisCurve])
      this.getAlongCache[key] = result
      return result
    }
  }

  getIsWithin({ x, y }: Vector2) {
    for (let c = 0; c < this.curves.length; c++) {
      const curve = this.curves[c]
      const thickness = curve[0].thickness / this.size.x
      let lastXValues: number[] = []
      let lastYValues: number[] = []
      let thisXValues = [curve[0].x - thickness, curve[0].x + thickness]
      let thisYValues = [curve[0].y - thickness, curve[0].y + thickness]
      const count = this.size.x / 50 // sample every 50 px
      for (let i = 1; i < count; i++) {
        const progress = this.getAlongCached(i / count, c)

        const thickness =
          this.getAlong(i / count, ...curve.map(x => x.thickness)) / this.size.x

        lastXValues = thisXValues
        lastYValues = thisYValues
        thisXValues = [progress.x - thickness / 2, progress.x + thickness / 2]
        thisYValues = [progress.y - thickness / 2, progress.y + thickness / 2]
        const minX = Math.min(...lastXValues, ...thisXValues)
        const maxX = Math.max(...lastXValues, ...thisXValues)
        const minY = Math.min(...lastYValues, ...thisYValues)
        const maxY = Math.max(...lastYValues, ...thisYValues)

        if (x > minX && x < maxX && y > minY && y < maxY) {
          return true
        }
      }
    }
    return false
  }

  getWave(
    frequency: number = 1,
    {
      waveshape = 'sine',
      signed = false
    }: { waveshape?: 'sine' | 'saw'; signed?: boolean } = {}
  ) {
    let noise: number
    switch (waveshape) {
      case 'sine':
        noise = Math.sin(this.time * frequency)
        break
      case 'saw':
        noise = Math.abs(0.5 - ((this.time * frequency) % 1)) * 2 * 2 - 1
        break
    }
    return signed ? noise : (noise + 1) / 2
  }

  getWaveNoise(
    frequency = 1,
    {
      index,
      signed = false,
      harmonics = 1
    }: { index?: number; signed?: boolean; harmonics?: number } = {}
  ) {
    if (index === undefined) index = this.noiseIndex

    if (!this.noiseFuncs[index]) {
      const waves = range(harmonics).map(() => Math.random())
      this.noiseFuncs.push(() => {
        let total = 0
        let harmonic = 0
        for (let i = 0; i < waves.length; i++) {
          harmonic += 1 / (i + 1)
          total +=
            this.getWave(waves[i] * frequency * (i + 1), { signed: true }) /
            (i + 1)
        }
        return total / harmonic
      })
    }
    const noise = signed
      ? this.noiseFuncs[index]()
      : (this.noiseFuncs[index]() + 1) / 2
    this.noiseIndex++
    return noise
  }

  getPoint(index: number = -1, curve: number = -1) {
    if (curve < 0) curve += this.curves.length
    if (index < 0) index += this.curves[curve].length
    return this.curves[curve][index]
  }

  getIntersect(progress: number, curve: number = -1) {
    if (curve < 0) curve += this.curves.length
    if (progress < 0) progress += 1
    return this.fromPoint(this.getAlongCached(progress, curve))
  }

  fromPoint(point: Vector2) {
    return this.applyTransform(point, this.currentTransform, true).toArray()
  }

  toPoints(...coordinates: (Coordinate | PointBuilder | CoordinateData)[]) {
    let points: PointBuilder[] = []
    for (let i = 0; i < coordinates.length; i++) {
      if (coordinates[i] instanceof Array) {
        points.push(this.toPoint(coordinates[i] as Coordinate))
      } else if (coordinates[i] instanceof PointBuilder) {
        points.push(coordinates[i] as PointBuilder)
      } else {
        this.transform(coordinates[i] as CoordinateSettings)
      }
    }
    return points
  }

  protected getPointSettings(): CoordinateSettings {
    const newPointSettings: CoordinateSettings = {} as any
    for (let [key, value] of entries(this.pointSettings)) {
      if (typeof value === 'function') {
        newPointSettings[key] = value([
          last(this.curves)?.length ?? 0,
          this.curves.length
        ])
      } else {
        newPointSettings[key] = value
      }
    }
    return newPointSettings
  }

  toPoint(coordinate: Coordinate | PointBuilder | Vector2) {
    if (coordinate instanceof PointBuilder) return coordinate
    else if (coordinate instanceof Vector2)
      return new PointBuilder(
        [coordinate.x, coordinate.y],
        this.getPointSettings()
      )
    else {
      if (coordinate[2]) {
        this.transform(coordinate[2])
      }
      return this.applyTransform(
        new PointBuilder(
          [coordinate[0], coordinate[1]],
          this.getPointSettings()
        ),
        this.currentTransform
      )
    }
  }

  protected interpolateCurve(
    curve: PointBuilder[],
    controlPointsCount: number
  ) {
    const newCurvePoints: PointBuilder[] = []
    for (let i = 0; i < controlPointsCount; i++) {
      const u = i / (controlPointsCount - 1)
      newCurvePoints.push(new PointBuilder(multiBezierJS(u, ...curve)))
      curve.splice(0, curve.length, ...newCurvePoints)
    }
  }

  getLength(curve: PointBuilder[]) {
    let length = 0
    const testVec = new Vector2()
    for (let i = 1; i < curve.length; i++) {
      length += testVec.subVectors(curve[i], curve[i - 1]).length()
    }
    return length * 1.5 // estimation for Bezier curve
  }

  protected getTransformAt(transforms: TransformData[], progress: number) {
    const { t, start } = {
      start: Math.floor(progress * (transforms.length - 1)),
      t: (progress * (transforms.length - 1)) % 1
    }

    const curveInterpolate = <T extends Vector2 | number>(groups: T[]) => {
      if (groups[0] instanceof Vector2) {
        invariant(groups[1] instanceof Vector2)
        return groups[0].clone().lerp(groups[1], t)
      } else if (typeof groups[0] === 'number') {
        invariant(typeof groups[1] === 'number')
        return lerp(groups[0], groups[1], t)
      }
    }

    const makeBezier = <T extends keyof TransformData>(key: T) => {
      const groups = range(2).map(
        i => transforms[(start + i) % transforms.length][key]
      )

      return curveInterpolate(groups as any)
    }

    const { rotate, translate, scale } = {
      rotate: makeBezier('rotate'),
      translate: makeBezier('translate'),
      scale: makeBezier('scale')
    }

    return { rotate, translate, scale } as TransformData
  }

  getBounds(points: PointBuilder[]) {
    const flatX = points.map(x => x.x)
    const flatY = points.map(y => y.y)
    const minCoord = new Vector2(min(flatX)!, min(flatY)!)
    const maxCoord = new Vector2(max(flatX)!, max(flatY)!)
    return {
      min: minCoord,
      max: maxCoord,
      size: new Vector2().subVectors(maxCoord, minCoord),
      center: new Vector2().lerpVectors(minCoord, maxCoord, 0.5)
    }
  }

  randomize({
    translate,
    rotate,
    scale
  }: {
    translate?: [Coordinate, Coordinate]
    rotate?: [number, number]
    scale?: [Coordinate, Coordinate]
  }) {
    let translatePoint = translate
      ? this.toPoint(translate[0])
          .lerpRandom(this.toPoint(translate[1]))
          .toArray()
      : undefined
    let rotatePoint = rotate
      ? lerp(this.toRad(rotate[0]), this.toRad(rotate[1]), Math.random())
      : undefined
    let scalePoint = scale
      ? this.toPoint(scale[0]).lerpRandom(this.toPoint(scale[1])).toArray()
      : undefined
    const transform = this.toTransform({
      translate: translatePoint,
      scale: scalePoint,
      rotate: rotatePoint
    })
    this.curves.flat().forEach(p => {
      this.applyTransform(p, transform)
    })

    return this
  }

  getRandomAlong(...curve: Coordinate[]) {
    const curvePoints = curve.map(x => this.toPoint(x))
    if (curve.length === 2) {
      return this.toPoint(curve[0]).lerp(this.toPoint(curve[1]), Math.random())
    }
    return new PointBuilder([0, 0]).copy(
      multiBezierJS(Math.random(), ...curvePoints)
    )
  }

  getRandomWithin(low: number, high: number): number
  getRandomWithin(
    low: [number, number],
    high: [number, number]
  ): [number, number]
  getRandomWithin(
    low: [number, number],
    high: [number, number],
    count: number
  ): [number, number][]
  getRandomWithin(low: number, high: number, count: number): number[]
  getRandomWithin(
    low: number | [number, number],
    high: number | [number, number],
    count = 1
  ): number | [number, number] | (number | [number, number])[] {
    const random = () => {
      if (typeof low === 'number' && typeof high === 'number') {
        return low + Math.random() * (high - low)
      } else {
        return [
          low[0] + Math.random() * (high[0] - low[0]),
          low[1] + Math.random() * (high[1] - low[1])
        ] as [number, number]
      }
    }
    if (count > 1) {
      return _.range(count).map(() => random())
    } else return random()
  }

  /**
   * @param {number} variation variation limits
   */
  getRandomAround(origin: number, variation: number): number
  getRandomAround(
    origin: [number, number],
    variation: [number, number]
  ): [number, number]
  getRandomAround(
    origin: [number, number],
    variation: [number, number],
    count: number
  ): [number, number][]
  getRandomAround(origin: number, variation: number, count: number): number[]
  getRandomAround(
    origin: number | [number, number],
    variation: number | [number, number],
    count = 1
  ): number | [number, number] | (number | [number, number])[] {
    const random = () => {
      if (typeof origin === 'number' && typeof variation === 'number') {
        return origin + (Math.random() - 0.5) * variation
      } else {
        return new Vector2(...(origin as [number, number]))
          .add(
            new Vector2()
              .random()
              .subScalar(0.5)
              .multiplyScalar(2)
              .multiply(new Vector2(...(variation as [number, number])))
          )
          .toArray()
      }
    }
    if (count > 1) {
      return _.range(count).map(() => random())
    } else return random()
  }

  debug() {
    console.log(
      `
${this.curves
  .map(c =>
    c
      .map(
        p =>
          `${p
            .toArray()
            .map(p => p.toFixed(2))
            .join(',')}`
      )
      .join(' ')
  )
  .join('\n')}`
    )
    return this
  }

  within(from: Coordinate | Vector2, to: Coordinate | Vector2, curves: number) {
    const fromV = this.toPoint(from)
    const size = new Vector2().copy(this.toPoint(to)).sub(fromV)

    this.lastCurves(g => {
      const curves = g.flat()
      const bounds = this.getBounds(curves)
      curves.forEach(p => {
        p.sub(bounds.min).divide(bounds.size).multiply(size).add(fromV)
      })
    }, curves)

    return this
  }

  withinX(from: number, to: number, curves: number) {
    const size = to - from

    this.lastCurves(g => {
      const curves = g.flat()
      const bounds = this.getBounds(curves)
      curves.forEach(p => {
        p.sub(bounds.min)
          .divide({ x: bounds.size.x, y: bounds.size.x })
          .multiply({ x: size, y: size })
          .add({ x: from, y: bounds.min.y })
      })
    }, curves)

    return this
  }

  protected lastCurve(callback: (curve: PointBuilder[]) => void, curves = 1) {
    callback(this.curves[this.curves.length - curves])
    return this
  }

  protected lastCurves(
    callback: (curves: PointBuilder[][]) => void,
    curves: number
  ) {
    let newCurves: PointBuilder[][] = this.curves.slice(
      this.curves.length - curves
    )
    callback(newCurves)
  }

  /**
   * Slide the curve along itself to offset its start point.
   */
  slide(amount: number) {
    return this.lastCurve(curve => {
      // const totalLength = path.getLength()
      const offset = curve[0].clone().sub(this.getAlongCached(amount, -1))
      curve.forEach(point => point.add(offset))
    })
  }

  newCurvesBlank(curveCount: number, pointCount: number) {
    this.curves.push(
      ...range(curveCount).map(() =>
        range(pointCount).map(() => new PointBuilder())
      )
    )
    return this
  }

  newCurve(...points: (Coordinate | PointBuilder | CoordinateData)[]) {
    this.curves.push(this.toPoints(...points))
    return this
  }

  getShape(divisions: 3 | 4 | 5 | 6 | 7 | 8) {
    let shape
    switch (divisions) {
      case 6:
        shape = [
          [0.5, 0],
          [0.5, 1],
          [-0.5, 1],
          [-0.5, 0],
          [0, 0]
        ]
        break
      case 7:
        shape = [
          [0.33 / 2, 0],
          [0.5, 0.33],
          [0.5, 0.66],
          [0.33 / 2, 1],
          [-0.33 / 2, 1],
          [-0.5, 0.66],
          [-0.5, 0.33],
          [-0.33 / 2, 0],
          [0, 0]
        ]
        break
    }
    return shape
  }

  newCurves(
    count: number,
    ...points: (Coordinate | PointBuilder | CoordinateData)[]
  ) {
    return this.repeat(count, () => this.newCurve(...points))
  }

  newPoints(...points: (Coordinate | PointBuilder | CoordinateData)[]) {
    return this.lastCurve(c => c.push(...this.toPoints(...points)))
  }

  setCurves(
    curves: number | 'all' | 'new',
    settings: Partial<{
      center: number
      left: number
      width: number
      top: number
      middle: number
      varyPosition?: [number, number]
    }>
  ) {
    const textCurves = this.curves.slice(
      curves === 'all'
        ? 0
        : curves === 'new'
        ? this.lastIndex
        : curves < 0
        ? this.curves.length + curves
        : curves
    )
    const flatCurves = textCurves.flat()
    const bounds = this.getBounds(textCurves.flat())

    if (settings.varyPosition) {
      const varyPosition: [number, number] =
        settings.varyPosition instanceof Array
          ? settings.varyPosition
          : [settings.varyPosition, settings.varyPosition]
      flatCurves.forEach(point => {
        this.applyTransform(
          point,
          this.toTransform({
            translate: this.getRandomAround([0, 0], varyPosition)
          })
        )
      })
    }

    if (settings.width) {
      this.within(
        bounds.min,
        bounds.min
          .clone()
          .add(bounds.size.divideScalar(bounds.size.x / settings.width)),
        textCurves.length
      )
      bounds.max = bounds.min.clone().add(bounds.size)
      bounds.center = bounds.min
        .clone()
        .add(bounds.size.clone().divideScalar(2))
    }

    if (settings.center !== undefined) {
      const lineBounds = this.getBounds(flatCurves)
      console.log(settings.center - lineBounds.center.x)

      flatCurves.forEach(point =>
        point.add({ x: settings.center! - lineBounds.center.x, y: 0 })
      )
    }

    if (settings.left !== undefined) {
      textCurves.flat().forEach(point =>
        point.add({
          x: settings.left! - bounds.min.x,
          y: 0
        })
      )
    }

    if (settings.top !== undefined) {
      textCurves
        .flat()
        .forEach(point => point.add({ x: 0, y: settings.top! - bounds.max.y }))
    }

    if (settings.middle !== undefined) {
      textCurves
        .flat()
        .forEach(point =>
          point.add({ x: 0, y: settings.middle! - bounds.center.y })
        )
    }
    return this
  }

  newText(
    str: string,
    transform?: CoordinateData,
    settings?: Parameters<(typeof this)['setCurves']>[1],
    eachLetter?: (i: number) => void
  ) {
    if (transform) {
      this.transform({ ...transform, push: true })
    }
    this.lastIndex = this.curves.length

    const lines: number[] = [this.curves.length]
    let i = 0
    for (let letter of str) {
      if (eachLetter) eachLetter(i)
      if (this.font.letters[letter]) {
        this.transform({ strength: 0, translate: [0.2, 0], push: true })
        this.font.letters[letter](this)
      } else if (letter === '\n') {
        lines.push(this.curves.length)
        this.transform({
          reset: 'pop',
          translate: [0, -1.5],
          push: true
        })
      }
      i++
    }

    if (settings) {
      this.setCurves('new', settings)
    }

    return this
  }

  reInitialize(seconds: number, size: Vector2) {
    this.getAlongCache = {}
    this.time = seconds
    this.h = size.y / size.x
    this.size.copy(size)
    this.reset(true)
    this.hashIndex = 0
    this.noiseIndex = 0
    this.onInit(this)
    return this
  }

  clear() {
    this.curves.splice(0, this.curves.length)
    return this
  }

  constructor(onInit: (g: GroupBuilder) => any) {
    super()
    this.onInit = onInit
  }
}
