import _, { last, max, min, now, random, range } from 'lodash'
import {
  AnyPixelFormat,
  ClampToEdgeWrapping,
  CurvePath,
  DataTexture,
  FloatType,
  LinearFilter,
  LineCurve,
  MagnificationTextureFilter,
  NearestFilter,
  QuadraticBezierCurve,
  RedFormat,
  RGBAFormat,
  Vector2
} from 'three'
import invariant from 'tiny-invariant'
import { lerp } from '../math'
import { PointBuilder } from './PointBuilder'
import { isBrushType } from './typeGuards'
import {
  Node,
  PassNode,
  PostProcessing,
  Renderer,
  WebGPURenderer
} from 'three/webgpu'
import {
  float,
  instance,
  mrt,
  output,
  pass,
  ShaderNodeObject,
  texture
} from 'three/tsl'
import { createNoise2D, createNoise3D, createNoise4D } from 'simplex-noise'

export const defaultCoordinateSettings: CoordinateSettings = {
  strength: 0,
  alpha: 1,
  color: [1, 1, 1],
  thickness: 1
}

export class Builder {
  protected noiseFuncs = {}
  protected transforms: TransformData[] = []
  currentTransform: TransformData = this.toTransform()
  settings: ProcessData = {
    maxLength: 0,
    maxCurves: 0,
    maxPoints: 0,
    align: 0.5,
    resample: true,
    recalculate: false,
    start: 0,
    update: false,
    pointVert: input => input,
    pointFrag: input => input,
    curveVert: input => input,
    curveFrag: input => input,
    spacing: 3,
    spacingType: 'pixel',
    renderTargets: mrt({
      output
    })
  }
  pointSettings: PreTransformData & CoordinateSettings =
    defaultCoordinateSettings
  protected randomTable?: number[]
  protected hashIndex: number = 0

  repeat(
    runCount: number,
    func: ({ p, i, count }: { p: number; i: number; count: number }) => void
  ) {
    for (let i = 0; i < runCount; i++) {
      func({ p: i / runCount, i, count: runCount })
    }

    return this
  }

  protected reset(clear = false) {
    this.currentTransform = this.toTransform()
    this.pointSettings = { ...defaultCoordinateSettings }

    if (clear) this.transforms = []
    return this
  }

  transform(transform: Partial<Builder['pointSettings']>) {
    if (transform.reset) {
      switch (transform.reset) {
        case 'pop':
          this.currentTransform = this.transforms.pop() ?? this.toTransform()
          break
        case 'last':
          this.currentTransform = this.cloneTransform(
            last(this.transforms) ?? this.toTransform()
          )
          break
        case true:
          this.reset()
          break
      }
    }

    this.currentTransform = this.combineTransforms(
      this.currentTransform,
      this.toTransform(transform)
    )

    if (transform.push) {
      this.transforms.push(this.cloneTransform(this.currentTransform))
    }

    Object.assign(this.pointSettings, transform)

    return this
  }

  protected combineTransforms(
    transformData: TransformData,
    nextTransformData: TransformData,
    invert: boolean = false
  ) {
    if (invert) {
      transformData.translate.sub(
        nextTransformData.translate
          .divide(transformData.scale)
          .rotateAround({ x: 0, y: 0 }, -transformData.rotate)
      )
      transformData.rotate -= nextTransformData.rotate
      transformData.scale.divide(nextTransformData.scale)
    } else {
      transformData.translate.add(
        nextTransformData.translate
          .multiply(transformData.scale)
          .rotateAround({ x: 0, y: 0 }, transformData.rotate)
      )
      transformData.rotate += nextTransformData.rotate
      transformData.scale.multiply(nextTransformData.scale)
    }

    return transformData
  }

  protected applyTransform<T extends Vector2>(
    vector: T,
    transformData: TransformData,
    invert: boolean = false
  ): T {
    if (invert) {
      vector
        .sub(transformData.translate)
        .rotateAround({ x: 0, y: 0 }, -transformData.rotate)
        .divide(transformData.scale)
    } else {
      vector
        .multiply(transformData.scale)
        .rotateAround({ x: 0, y: 0 }, transformData.rotate)
        .add(transformData.translate)
    }

    return vector
  }

  protected cloneTransform(transform: TransformData): TransformData {
    return {
      scale: transform.scale.clone(),
      rotate: transform.rotate,
      translate: transform.translate.clone()
    }
  }

  protected toTransform(transform?: PreTransformData): TransformData {
    if (!transform) {
      return {
        scale: new Vector2(1, 1),
        rotate: 0,
        translate: new Vector2()
      }
    }
    return {
      scale:
        typeof transform.scale === 'number'
          ? new Vector2(transform.scale, transform.scale)
          : transform.scale instanceof Array
            ? new Vector2(...transform.scale)
            : transform.scale ?? new Vector2(1, 1),
      rotate: this.toRad(transform.rotate ?? 0),
      translate:
        transform.translate instanceof Array
          ? new Vector2(...transform.translate)
          : transform.translate ?? new Vector2()
    }
  }

  protected toRad(rotation: number) {
    return rotation * Math.PI * 2
  }

  protected fromRad(rotation: number) {
    return rotation / Math.PI / 2
  }

  toRange(input: number, bounds: [number, number], exponent: number = 1) {
    return input ** exponent * (bounds[1] - bounds[0]) + bounds[0]
  }

  /**
   * i: int 1-100
   */
  hash(i?: number, reseed: boolean = false) {
    if (!this.randomTable || reseed) {
      this.randomTable = range(100).map(() => Math.random())
    }

    if (i === undefined) {
      this.hashIndex++
      i = this.hashIndex
    }

    i = i % this.randomTable.length

    const first = this.randomTable[Math.floor(i)]
    const second = this.randomTable[Math.ceil(i)]
    return first + (second - first) * (i % 1)
  }

  noise(
    coords:
      | [number, number]
      | [number, number, number]
      | [number, number, number, number],
    index: number | string = '0'
  ) {
    if (!this.noiseFuncs[index]) {
      switch (coords.length) {
        case 2:
          this.noiseFuncs[index] = createNoise2D()
          break
        case 3:
          this.noiseFuncs[index] = createNoise3D()
          break
        case 4:
          this.noiseFuncs[index] = createNoise4D()
          break
      }
    }

    return (this.noiseFuncs[index](...coords) + 1) / 2
  }

  constructor() {}
}

export class GroupBuilder<T extends BrushTypes> extends Builder {
  h: number
  time: number = performance.now() / 1000
  curves: PointBuilder[][] = []
  protected initialize: (t: GroupBuilder<T>) => GroupBuilder<T> | void
  brushSettings: BrushData<T>

  getPoint(index: number = -1, curve: number = -1) {
    if (curve < 0) curve += this.curves.length
    if (index < 0) index += this.curves[curve].length
    return this.fromPoint(this.curves[curve][index])
  }

  getIntersect(progress: number, curve: number = -1) {
    if (curve < 0) curve += this.curves.length
    if (progress < 0) progress += 1

    const curvePath = this.makeCurvePath(this.curves[curve])
    return this.fromPoint(curvePath.getPointAt(progress))
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
        this.transform(coordinates[i] as CoordinateData)
      }
    }
    return points
  }

  toPoint(coordinate: Coordinate | PointBuilder | Vector2) {
    if (coordinate instanceof PointBuilder) return coordinate
    else if (coordinate instanceof Vector2)
      return new PointBuilder([coordinate.x, coordinate.y], this.pointSettings)
    else {
      if (coordinate[2]) {
        this.transform(coordinate[2])
      }
      return this.applyTransform(
        new PointBuilder([coordinate[0], coordinate[1]], this.pointSettings),
        this.currentTransform
      )
    }
  }

  protected interpolateCurve(
    curve: PointBuilder[],
    controlPointsCount: number
  ) {
    const newCurve = this.makeCurvePath(curve)

    const newCurvePoints: PointBuilder[] = []
    for (let i = 0; i < controlPointsCount; i++) {
      const u = i / (controlPointsCount - 1)
      newCurvePoints.push(
        new PointBuilder(newCurve.getPointAt(u).toArray() as [number, number])
      )
      curve.splice(0, curve.length, ...newCurvePoints)
    }
  }

  protected getLength(curve: PointBuilder[]) {
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

      return curveInterpolate(groups)
    }

    const { rotate, translate, scale } = {
      rotate: makeBezier('rotate'),
      translate: makeBezier('translate'),
      scale: makeBezier('scale')
    }

    return { rotate, translate, scale } as TransformData
  }

  protected makeCurvePath(curve: PointBuilder[]): CurvePath<Vector2> {
    const path: CurvePath<Vector2> = new CurvePath()
    if (curve.length <= 1) {
      throw new Error(`Curve length is ${curve.length}`)
    }
    if (curve.length == 2) {
      path.add(new LineCurve(curve[0], curve[1]))
      return path
    }
    for (let i = 0; i < curve.length - 2; i++) {
      if ((curve[i + 1].strength ?? 0) > 0.5) {
        path.add(
          new LineCurve(
            i === 0 ? curve[i] : curve[i].clone().lerp(curve[i + 1], 0.5),
            curve[i + 1]
          )
        )
        path.add(
          new LineCurve(
            curve[i + 1],
            i === curve.length - 3
              ? curve[i + 2]
              : curve[i + 1].clone().lerp(curve[i + 2], 0.5)
          )
        )
      } else {
        path.add(
          new QuadraticBezierCurve(
            i === 0 ? curve[i] : curve[i].clone().lerp(curve[i + 1], 0.5),
            curve[i + 1],
            i === curve.length - 3
              ? curve[i + 2]
              : curve[i + 1].clone().lerp(curve[i + 2], 0.5)
          )
        )
      }
    }
    return path
  }

  protected getBounds(points: PointBuilder[], transform?: TransformData) {
    const flatX = points.map(x => x.x)
    const flatY = points.map(y => y.y)
    const minCoord = new Vector2(min(flatX)!, min(flatY)!)
    const maxCoord = new Vector2(max(flatX)!, max(flatY)!)
    if (transform) {
      this.applyTransform(minCoord, transform)
      this.applyTransform(maxCoord, transform)
    }
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
    const curvePath = this.makeCurvePath(curvePoints)
    if (curve.length === 2) {
      return this.toPoint(curve[0]).lerp(this.toPoint(curve[1]), Math.random())
    }
    return new PointBuilder([0, 0]).copy(curvePath.getPointAt(Math.random()))
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
    const amt = amount < 0 ? 1 + amount : amount
    return this.lastCurve(curve => {
      const path = this.makeCurvePath(curve)
      // const totalLength = path.getLength()
      const offset = curve[0].clone().sub(path.getPointAt(amount))
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

  newCurves(
    count: number,
    ...points: (Coordinate | PointBuilder | CoordinateData)[]
  ) {
    return this.repeat(count, () => this.newCurve(...points))
  }

  newPoints(...points: (Coordinate | PointBuilder | CoordinateData)[]) {
    return this.lastCurve(c => c.push(...this.toPoints(...points)))
  }

  text(
    str: string,
    settings?: Partial<{
      center: number
      left: number
      width: number
      top: number
      middle: number
      varyThickness: number
      varyPosition: number | [number, number]
    }>,
    transform?: CoordinateData
  ) {
    if (transform) {
      this.transform({ ...transform, push: true })
    }

    const lines: number[] = [this.curves.length]
    for (let letter of str) {
      if (this.letters[letter]) {
        this.transform({ strength: 0, translate: [0.2, 0], push: true })
        this.letters[letter]()
      } else if (letter === '\n') {
        lines.push(this.curves.length)
        this.transform({
          reset: 'pop',
          translate: [0, -1.5],
          push: true
        })
      }
    }

    if (settings) {
      const textCurves = this.curves.slice(lines[0])
      const flatCurves = textCurves.flat()
      const bounds = this.getBounds(textCurves.flat())

      if (settings.varyThickness) {
        flatCurves.forEach(point => {
          point.thickness = this.getRandomAround(
            point.thickness,
            settings.varyThickness!
          )
        })
      }

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
        let i = 0
        for (let line of lines) {
          const linePoints = this.curves.slice(line, lines[i + 1]).flat()
          const lineBounds = this.getBounds(linePoints)

          linePoints.forEach(point =>
            point.add({ x: settings.center! - lineBounds.center.x, y: 0 })
          )
          i++
        }
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
          .forEach(point =>
            point.add({ x: 0, y: settings.top! - bounds.max.y })
          )
      }

      if (settings.middle !== undefined) {
        textCurves
          .flat()
          .forEach(point =>
            point.add({ x: 0, y: settings.middle! - bounds.center.y })
          )
      }
    }

    return this
  }

  protected letters: Record<string, () => GroupBuilder<T>> = {
    ' ': () => this.transform({ translate: [0.5, 0], reset: 'pop' }),
    '\t': () => this.transform({ translate: [2, 0], reset: 'pop' }),
    a: () =>
      this.newCurve([1, 1], [0.5, 1.3], [0, 0.5], [0.5, -0.3], [1, 0])
        .newCurve([0, 1, { translate: [1, 0] }], [-0.1, 0.5], [0, -0.3])
        .slide(0.1)
        .within([0, 0, { reset: 'pop' }], [0.5, 0.6], 2)
        .transform({ translate: [0.5, 0] }),
    b: () =>
      this.newCurve([0, 1], [0, 0])
        .newCurve(
          [0, 1, { scale: [0.5, 0.5] }],
          [0.5, 1.1],
          [1, 0.5],
          [0.5, -0.1],
          [0, 0]
        )
        .within([0, 0, { reset: 'pop' }], [0.5, 1], 2)
        .transform({ translate: [0.5, 0] }),
    c: () =>
      this.newCurve(
        [1, 0.75, { scale: [0.5, 0.5] }],
        [0.9, 1],
        [0, 1],
        [0, 0],
        [0.9, 0],
        [1, 1 - 0.75]
      )
        .within([0, 0, { reset: 'pop' }], [0.5, 0.5], 1)
        .transform({ translate: [0.5, 0] }),
    d: () =>
      this.newCurve([1, 1], [1, 0])
        .newCurve(
          [0, 1, { scale: [-0.5, 0.5], translate: [1, 0] }],
          [0.5, 1.1],
          [1, 0.5],
          [0.5, -0.1],
          [0, 0]
        )
        .within([0, 0, { reset: 'pop' }], [0.5, 1], 2)
        .transform({ translate: [0.5, 0] }),
    e: () =>
      this.newCurve([0, 0.5], [1, 0.5])
        .newCurve([1, 0.5], [1, 1], [0, 1], [0, 0], [0.9, 0], [1, 0.2])
        .within([0, 0, { reset: 'pop' }], [0.5, 0.5], 2)
        .transform({ translate: [0.5, 0] }),
    f: () =>
      this.newCurve([0, 0], [0, 1 / 2], [0, 1], [1 / 2, 1], [1 / 2, 0.75])
        .newCurve([0, 1 / 2], [1 / 2, 1 / 2])
        .slide(1 / 4)
        .within([0, 0, { reset: 'pop' }], [1 / 2, 1], 2)
        .transform({ translate: [0.35, 0] }),
    g: () =>
      this.newCurve(
        [0.5, 0.5],
        [0.5, 0],
        [0, 0],
        [0, 0.5],
        [0.3, 0.6],
        [0.5, 0.5]
      )
        .newCurve([0.5, 0.5], [0.5, 0], [0.5, -0.5], [0, -0.5], [0.05, -0.25])
        .within([0, -0.5, { reset: 'pop' }], [0.5, 0.5], 2)
        .transform({ translate: [0.5, 0] }),
    h: () =>
      this.newCurve([0, 0], [0, 1])
        .newCurve([0, 0.6, { scale: [0.5, 0.7] }], [1, 1], [1, 0])
        .transform({ translate: [0.5, 0], reset: 'pop' }),
    i: () =>
      this.transform({ translate: [0.2, 0], push: true })
        .newCurve([0, 0], [0, 1, { scale: [1, 0.5] }])
        .newCurve(
          [0, 0, { reset: 'last', translate: [0, 0.52], scale: 0.05 / 0.5 }],
          [-1, 0],
          [-1, 1],
          [1, 1],
          [1, 0],
          [0, 0]
        )
        .transform({ reset: 'pop' })
        .transform({ translate: [0.2, 0], reset: 'pop' }),
    j: () =>
      this.transform({ translate: [-0.25, 0], push: true })
        .newCurve(
          [0, 0, { translate: [1 - 0.4, 1], scale: [0.7, 1], rotate: 0.05 }],
          [0, -1],
          [-1, -1],
          [-1, -0.5]
        )
        .transform({ rotate: -0.05 })
        .newCurve(
          [
            0,
            0,
            {
              translate: [0, 0.2],
              scale: [0.1 / 2, 0.1]
            }
          ],
          [-1, 0],
          [-1, 1],
          [1, 1],
          [1, 0],
          [0, 0]
        )
        .within([0, -0.5, { reset: 'pop' }], [0.5, 0.5], 2)
        .transform({ translate: [0.25, 0], reset: 'pop' }),
    k: () =>
      this.newCurve([0, 1], [0, 0])
        .newCurve(
          [0, 0, { translate: this.getIntersect(0.6), push: true }],
          [0.3, 0, { rotate: 0.15 }]
        )
        .newCurve([0, 0, { reset: 'pop' }], [0.3, 0, { reset: 'pop' }])
        .within([0, 0], [0.5, 1], 3)
        .transform({ translate: [0.5, 0] }),
    l: () =>
      this.newCurve([0, 1], [0, 0.2], [0, 0], [0.1, 0]).transform({
        translate: [0.2, 0],
        reset: 'pop'
      }),
    m: () =>
      this.newCurve([0, 0, { scale: [0.5, 0.5] }], [0, 1], [1, 1], [1, 0])
        .newCurve([0, 0, { translate: [1, 0] }], [0, 1], [1, 1], [1, 0])
        .transform({ translate: [1, 0], reset: 'pop' }),
    n: () =>
      this.newCurve(
        [0, 0, { scale: [0.5, 0.5] }],
        [0, 1],
        [1, 1],
        [1, 0]
      ).transform({
        translate: [0.5, 0],
        reset: 'pop'
      }),
    o: () =>
      this.newCurve(
        [0, 0, { translate: [0.25, 0], scale: 0.5 }],
        [-0.5, 0],
        [-0.5, 1],
        [0.5, 1],
        [0.5, 0],
        [0, 0]
      ).transform({ reset: 'pop', translate: [0.5, 0] }),
    p: () =>
      this.newCurve([0, 0, { translate: [0, -0.5] }], [0, 1])
        .newCurve(
          [0, 1, { reset: 'last', scale: 0.5 }],
          [1, 1.3],
          [1, -0.3],
          [0, 0]
        )
        .within([0, -0.5, { reset: 'pop' }], [0.5, 0.5], 2)
        .transform({ translate: [0.5, 0] }),
    q: () =>
      this.newCurve(
        [0, 1, { translate: [0, -0.5], push: true }],
        [0, 0, { strength: 1 }],
        [0.2, 0, { rotate: 0.15 }]
      )
        .newCurve(
          [0, 1, { reset: 'pop', scale: [0.5, 0.5], translate: [0, 0.5] }],
          [-1, 1.3],
          [-1, -0.3],
          [0, 0]
        )
        .within([0, -0.5, { reset: 'pop' }], [0.5, 0.5], 2)
        .transform({ translate: [0.5, 0] }),
    r: () =>
      this.newCurve([0, 0], [0, 0.5])
        .newCurve(
          [0, 0, { translate: this.getIntersect(0.9) }],
          [0.25, 0.1],
          [0.5, 0]
        )
        .transform({ translate: [0.5, 0], reset: 'pop' }),
    s: () =>
      this.newCurve(
        [0.5, 1, { translate: [-0.1, 0], push: true }],
        [0.2, 1],
        [0.2, 0.6],
        [0.5, 0.6],
        [1, 0.6],
        [1, 0],
        [0, 0]
      )
        .within([0, 0, { reset: 'pop' }], [0.5, 0.5], 1)
        .transform({ translate: [0.45, 0], reset: 'pop' }),
    t: () =>
      this.newCurve([0, 0], [0, 1])
        .newCurve([0, 0, { translate: [0, 0.65], scale: [0.4, 1] }], [1, 0])
        .slide(0.5)
        .transform({ translate: [0.2, 0], reset: 'pop' }),
    u: () =>
      this.newCurve(
        [0, 0, { translate: [0, 0.5], scale: [0.5, 0.5] }],
        [0, -1],
        [1, -1],
        [1, 0]
      ).transform({ translate: [0.5, 0], reset: 'pop' }),
    v: () =>
      this.newCurve(
        [0, 0, { translate: [0, 0.5], scale: [0.5, 0.5] }],
        [0.5, -1, { strength: 1 }],
        [1, 0]
      ).transform({ translate: [0.5, 0], reset: 'pop' }),
    w: () =>
      this.newCurve(
        [0, 0.5, { scale: [0.7, 1], strength: 1 }],
        [0.25, 0, { strength: 1 }],
        [0.5, 0.5, { strength: 1 }],
        [0.75, 0, { strength: 1 }],
        [1, 0.5, { strength: 1 }]
      ).transform({ translate: [0.7, 0], reset: 'pop' }),
    x: () =>
      this.newCurve([1, 1, { translate: [0.25, 0.25], scale: 0.25 }], [-1, -1])
        .newCurve([-1, 1], [1, -1])
        .transform({ translate: [0.5, 0], reset: 'pop' }),
    y: () =>
      this.newCurve(
        [0, -1, { scale: [0.5, 0.5], translate: [-0.05, 0] }],
        [1, 1]
      )
        .newCurve([0.5, 0], [0, 1])
        .transform({ translate: [0.55, 0], reset: 'pop' }),
    z: () =>
      this.newCurve(
        [0, 1, { scale: 0.5 }],
        [1, 1, { strength: 1 }],
        [0, 0, { strength: 1 }],
        [1, 0]
      ).transform({ translate: [0.5, 0], reset: 'pop' })
  }

  reInitialize(resolution: Vector2) {
    this.reset(true)
    this.hashIndex = 0
    this.curves = []
    this.h = resolution.y / resolution.x
    this.time = performance.now() / 1000
    this.initialize(this)
    if (this.settings.maxPoints === 0) {
      this.settings.maxPoints = max(this.curves.flatMap(x => x.length))!
    }
    if (this.settings.maxLength === 0) {
      this.settings.maxLength = max(this.curves.map(x => this.getLength(x)))!
    }
    if (this.settings.maxCurves === 0) {
      this.settings.maxCurves = this.curves.length
    }
    return this
  }

  constructor(
    type: T,
    initialize: (builder: GroupBuilder<T>) => GroupBuilder<T> | void,
    settings: ProcessData,
    brushSettings?: Partial<BrushData<T>>
  ) {
    super()
    this.initialize = initialize
    this.h = 0
    this.settings = settings
    this.brushSettings = isBrushType(type, 'dash')
      ? {
          type,
          pointScale: input => input,
          pointRotate: input => input,
          dashSize: 10
        }
      : isBrushType(type, 'line')
        ? { type }
        : ({} as any)
    Object.assign(this.brushSettings, brushSettings)
  }
}

export default class SceneBuilder extends Builder {
  groups: GroupBuilder<any>[] = []
  sceneSettings: {
    postProcessing: (
      input: ReturnType<PassNode['getTextureNode']>,
      info: {
        scenePass: ReturnType<typeof pass>
        lastOutput: ReturnType<typeof texture>
      }
    ) => PostProcessing['outputNode']
  } = {
    postProcessing: input => input
  }

  newGroup<T extends BrushTypes>(
    type: T,
    render: (g: GroupBuilder<T>) => GroupBuilder<T> | void,
    settings?: Partial<Builder['settings']>,
    brushSettings?: Partial<BrushData<T>>
  ) {
    this.groups.push(
      new GroupBuilder(
        type,
        render,
        { ...this.settings, ...settings },
        brushSettings
      )
    )
    return this
  }

  constructor(
    initialize: (b: SceneBuilder) => SceneBuilder | void,
    settings?: Partial<SceneBuilder['sceneSettings']>
  ) {
    super()
    initialize(this)
    Object.assign(this.sceneSettings, settings)
  }
}
