import _, { last, max, min, random, range } from 'lodash'
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

export class GroupBuilder {
  h: number
  protected randomTable?: number[]
  protected transformData: TransformData = this.toTransform()
  protected transforms: TransformData[] = []
  protected data: PointBuilder[][] = []
  protected settings: GroupData['settings'] = {
    maxLength: 0,
    resample: true,
    maxCurves: 0,
    maxPoints: 0,
    strength: 0,
    align: 0.5,
    thickness: 1,
    color: [1, 1, 1],
    alpha: 1,
    spacing: 3,
    gap: 0,
    recalculate: false,
    spacingType: 'pixel',
    update: false,
    pointVert: input => input,
    pointFrag: input => input,
    curveVert: input => input,
    curveFrag: input => input
  }
  protected initialize: (t: GroupBuilder) => GroupBuilder | void

  protected reset(clear = false) {
    this.transformData.scale = new PointBuilder([1, 1])
    this.transformData.rotate = 0
    this.transformData.translate = new PointBuilder()

    if (clear) this.transforms = []
    return this
  }

  getPoint(index: number = -1, curve: number = -1) {
    if (curve < 0) curve += this.data.length
    if (index < 0) index += this.data[curve].length
    return this.fromPoint(this.data[curve][index])
  }

  getIntersect(progress: number, curve: number = -1) {
    if (curve < 0) curve += this.data.length
    if (progress < 0) progress += 1

    const curvePath = this.makeCurvePath(this.data[curve])
    return this.fromPoint(curvePath.getPointAt(progress))
  }

  fromPoint(point: Vector2) {
    return this.applyTransform(point, this.transformData, true).toArray()
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

  toPoints(...coordinates: (Coordinate | PointBuilder)[]) {
    return coordinates.map(x => this.toPoint(x))
  }

  toPoint(coordinate: Coordinate | PointBuilder) {
    if (coordinate instanceof PointBuilder) return coordinate
    if (coordinate[2]) {
      this.transform(coordinate[2])
    }

    return this.applyTransform(
      new PointBuilder([coordinate[0], coordinate[1]], coordinate[2]),
      this.transformData
    )
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

  combineTransforms(
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

  applyTransform<T extends Vector2>(
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

  protected getLength(curve: PointBuilder[]) {
    let length = 0
    const testVec = new Vector2()
    for (let i = 1; i < curve.length; i++) {
      length += testVec.subVectors(curve[i], curve[i - 1]).length()
    }
    return length * 1.5 // estimation for Bezier curve
  }

  protected packToTexture() {
    if (this.settings.maxPoints === 0) {
      this.settings.maxPoints = max(this.data.flatMap(x => x.length))!
    }
    if (this.settings.maxCurves === 0) {
      this.settings.maxCurves = this.data.length
    }
    if (this.settings.maxLength === 0) {
      this.settings.maxLength = max(this.data.map(x => this.getLength(x)))!
    }
    const width = this.settings.maxPoints
    const maxCurves =
      this.settings.maxCurves === 0 ? this.data.length : this.settings.maxCurves
    const height = maxCurves

    const dimensions = new Vector2(width, height)

    const createTexture = (
      array: Float32Array,
      format: AnyPixelFormat,
      filter: MagnificationTextureFilter = NearestFilter
    ) => {
      const tex = new DataTexture(array, width, height)
      tex.format = format
      tex.type = FloatType
      tex.minFilter = tex.magFilter = filter
      tex.wrapS = tex.wrapT = ClampToEdgeWrapping
      tex.needsUpdate = true
      return tex
    }

    const positionTex = createTexture(
      new Float32Array(
        range(height).flatMap(i => {
          const c = this.data[i]
          return c
            ? range(width).flatMap(i => {
                const point = c[i]
                return point
                  ? [
                      point.x,
                      point.y,
                      point.strength ?? this.settings.strength,
                      point.thickness ?? this.settings.thickness
                    ]
                  : [-1111, 0, 0, 0]
              })
            : range(width).flatMap(() => [-1111, 0, 0, 0])
        })
      ),
      RGBAFormat,
      LinearFilter
    )

    const colorTex = createTexture(
      new Float32Array(
        range(height).flatMap(i => {
          const c = this.data[i]
          return c
            ? range(width).flatMap(i => {
                const point = c[i]
                return point
                  ? [
                      ...(point.color ?? this.settings.color),
                      point.alpha ?? this.settings.alpha
                    ]
                  : [-1111, 0, 0, 0]
              })
            : range(width).flatMap(() => [-1111, 0, 0, 0])
        })
      ),
      RGBAFormat,
      LinearFilter
    )

    const countTex = createTexture(
      new Float32Array(
        range(height).flatMap(i => {
          const c = this.data[i]
          return c
            ? range(width).flatMap(i => {
                return [c.length]
              })
            : range(width).flatMap(() => [0])
        })
      ),
      RedFormat,
      LinearFilter
    )

    return {
      positionTex,
      colorTex,
      countTex,
      dimensions,
      transform: this.toTransform(),
      settings: this.settings
    }
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

  protected toRad(rotation: number) {
    return rotation * Math.PI * 2
  }

  protected fromRad(rotation: number) {
    return rotation / Math.PI / 2
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
    this.data.flat().forEach(p => {
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

  getRandomWithin(origin: number, variation: number): number
  getRandomWithin(origin: Coordinate, variation: Coordinate): PointBuilder
  getRandomWithin(
    origin: Coordinate,
    variation: Coordinate,
    count: number
  ): PointBuilder[]
  getRandomWithin(origin: number, variation: number, count: number): number[]
  getRandomWithin(
    origin: number | Coordinate,
    variation: number | Coordinate,
    count = 1
  ): number | PointBuilder | (number | PointBuilder)[] {
    const random = () => {
      if (typeof origin === 'number' && typeof variation === 'number') {
        return origin + (Math.random() - 0.5) * 2 * variation
      } else {
        return this.toPoint(origin as Coordinate).add(
          new Vector2()
            .random()
            .subScalar(0.5)
            .multiplyScalar(2)
            .multiply(this.toPoint(variation as Coordinate))
        )
      }
    }
    if (count > 1) {
      return _.range(count).map(() => random())
    } else return random()
  }

  debug() {
    console.log(
      `
${this.data
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

  within(from: Coordinate, to: Coordinate, curves: number) {
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
    callback(this.data[this.data.length - curves])
    return this
  }

  protected lastCurves(
    callback: (curves: PointBuilder[][]) => void,
    curves: number
  ) {
    let newCurves: PointBuilder[][] = this.data.slice(this.data.length - curves)
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

  /**
   * i: int 1-100
   */
  hash(i: number, reseed: boolean = false) {
    if (!this.randomTable || reseed)
      this.randomTable = range(100).map(() => random())
    const first = this.randomTable[Math.floor(i)]
    const second = this.randomTable[Math.ceil(i)]
    return first + (second - first) * (i % 1)
  }

  curvesBlank(pointCount: number, curveCount: number) {
    this.data.push(
      ...range(curveCount).map(() =>
        range(pointCount).map(() => new PointBuilder())
      )
    )
    return this
  }

  curves(
    count: number,
    generate: ({
      progress,
      index
    }: {
      progress: number
      index: number
    }) => (Coordinate | PointBuilder)[]
  ) {
    for (let i = 0; i < count; i++) {
      this.data.push(
        generate({ progress: i / (count - 1 || 1), index: i }).map(x =>
          this.toPoint(x)
        )
      )
    }
    return this
  }

  curve(...points: (Coordinate | PointBuilder)[]) {
    this.data.push(this.toPoints(...points))
    return this
  }

  points(...points: (Coordinate | PointBuilder)[]) {
    return this.lastCurve(c => c.push(...this.toPoints(...points)))
  }

  text(str: string) {
    let lineCount = 0
    for (let letter of str) {
      if (this.letters[letter]) {
        this.transform({ translate: [0.1, 0], push: true })
        this.letters[letter]()
      } else if (letter === '\n') {
        lineCount++

        this.transform({
          reset: 'pop',
          translate: [0, -1.1 * lineCount],
          push: true
        })
      }
    }

    return this
  }

  transform(transform: Partial<GroupBuilder['settings']>) {
    if (transform.reset) {
      switch (transform.reset) {
        case 'pop':
          this.transformData = this.transforms.pop() ?? this.toTransform()
          break
        case 'last':
          this.transformData = this.cloneTransform(
            last(this.transforms) ?? this.toTransform()
          )
          break
        case true:
          this.reset()
          break
      }
    }

    this.transformData = this.combineTransforms(
      this.transformData,
      this.toTransform(transform)
    )

    if (transform.push) {
      this.transforms.push(this.cloneTransform(this.transformData))
    }

    return this
  }

  set(settings: Partial<GroupBuilder['settings']>) {
    Object.assign(this.settings, settings)
    return this
  }

  protected letters: Record<string, () => GroupBuilder> = {
    ' ': () => this.transform({ translate: [0.5, 0], push: true }),
    '\t': () => this.transform({ translate: [2, 0], push: true }),
    a: () =>
      this.curve([1, 1], [0.5, 1.3], [0, 0.5], [0.5, -0.3], [1, 0])
        .curve([0, 1, { translate: [1, 0] }], [-0.1, 0.5], [0, -0.3])
        .slide(0.1)
        .within([0, 0, { reset: 'pop' }], [0.5, 0.6], 2)
        .transform({ translate: [0.5, 0] }),
    b: () =>
      this.curve([0, 1], [0, 0])
        .curve(
          [0, 1, { scale: [0.5, 0.5] }],
          [0.5, 1.1],
          [1, 0.5],
          [0.5, -0.1],
          [0, 0]
        )
        .within([0, 0, { reset: 'pop' }], [0.5, 1], 2)
        .transform({ translate: [0.5, 0] }),
    c: () =>
      this.curve(
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
      this.curve([1, 1], [1, 0])
        .curve(
          [0, 1, { scale: [-0.5, 0.5], translate: [1, 0] }],
          [0.5, 1.1],
          [1, 0.5],
          [0.5, -0.1],
          [0, 0]
        )
        .within([0, 0, { reset: 'pop' }], [0.5, 1], 2)
        .transform({ translate: [0.5, 0] }),
    e: () =>
      this.curve([0, 0.5], [1, 0.5])
        .curve([1, 0.5], [1, 1], [0, 1], [0, 0], [0.9, 0], [1, 0.2])
        .within([0, 0, { reset: 'pop' }], [0.5, 0.5], 2)
        .transform({ translate: [0.5, 0] }),
    f: () =>
      this.curve([0, 0], [0, 1 / 2], [0, 1], [1 / 2, 1], [1 / 2, 0.75])
        .curve([0, 1 / 2], [1 / 2, 1 / 2])
        .slide(1 / 4)
        .within([0, 0, { reset: 'pop' }], [1 / 2, 1], 2)
        .transform({ translate: [0.35, 0] }),
    g: () =>
      this.curve([0.5, 0.5], [0.5, 0], [0, 0], [0, 0.5], [0.3, 0.6], [0.5, 0.5])
        .curve([0.5, 0.5], [0.5, 0], [0.5, -0.5], [0, -0.5], [0.05, -0.25])
        .within([0, -0.5], [0.5, 0.5], 2)
        .transform({ translate: [0.5, 0] }),
    h: () =>
      this.curve([0, 0], [0, 1])
        .curve([0, 0.6, { scale: [0.5, 0.7] }], [1, 1], [1, 0])
        .transform({ translate: [0.5, 0], reset: 'pop' }),
    i: () =>
      this.transform({ translate: [0.2, 0], push: true })
        .curve([0, 0], [0, 1, { scale: [1, 0.5] }])
        .curve(
          [0, 0, { reset: 'last', translate: [0, 0.52], scale: 0.05 / 0.5 }],
          [-1, 0],
          [-1, 1],
          [1, 1],
          [1, 0],
          [0, 0]
        )
        .transform({ translate: [0.2, 0], reset: 'last' }),
    j: () =>
      this.transform({ translate: [-0.25, 0], push: true })
        .curve(
          [0, 0, { translate: [1 - 0.4, 1], scale: [0.7, 1], rotate: 0.05 }],
          [0, -1],
          [-1, -1],
          [-1, -0.5]
        )
        .transform({ rotate: -0.05 })
        .curve(
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
      this.curve([0, 1], [0, 0])
        .curve(
          [0, 0, { translate: this.getIntersect(0.6), push: true }],
          [0.3, 0, { rotate: 0.15 }]
        )
        .curve([0, 0, { reset: 'pop' }], [0.3, 0, { reset: 'pop' }])
        .within([0, 0], [0.5, 1], 3)
        .transform({ translate: [0.5, 0] }),
    l: () =>
      this.curve([0, 1], [0, 0.2], [0, 0], [0.1, 0]).transform({
        translate: [0.2, 0],
        reset: 'pop'
      }),
    m: () =>
      this.curve([0, 0, { scale: [0.5, 0.5] }], [0, 1], [1, 1], [1, 0])
        .curve([0, 0, { translate: [1, 0] }], [0, 1], [1, 1], [1, 0])
        .transform({ translate: [1, 0], reset: 'pop' }),
    n: () =>
      this.curve(
        [0, 0, { scale: [0.5, 0.5] }],
        [0, 1],
        [1, 1],
        [1, 0]
      ).transform({
        translate: [0.5, 0],
        reset: 'pop'
      }),
    o: () =>
      this.curve(
        [0, 0, { translate: [0.25, 0], scale: 0.5 }],
        [-0.5, 0],
        [-0.5, 1],
        [0.5, 1],
        [0.5, 0],
        [0, 0]
      ).transform({ reset: 'pop', translate: [0.5, 0] }),
    p: () =>
      this.curve([0, 0, { translate: [0, -0.5] }], [0, 1])
        .curve(
          [0, 1, { reset: 'last', scale: 0.5 }],
          [1, 1.3],
          [1, -0.3],
          [0, 0]
        )
        .within([0, -0.5, { reset: 'pop' }], [0.5, 0.5], 2)
        .transform({ translate: [0.5, 0] }),
    q: () =>
      this.curve(
        [0, 1, { translate: [0, -0.5], push: true }],
        [0, 0, { strength: 1 }],
        [0.2, 0, { rotate: 0.15 }]
      )
        .curve(
          [0, 1, { reset: 'pop', scale: [0.5, 0.5], translate: [0, 0.5] }],
          [-1, 1.3],
          [-1, -0.3],
          [0, 0]
        )
        .within([0, -0.5, { reset: 'pop' }], [0.5, 0.5], 2)
        .transform({ translate: [0.5, 0] }),
    r: () =>
      this.curve([0, 0], [0, 0.5])
        .curve(
          [0, 0, { translate: this.getIntersect(0.9) }],
          [0.25, 0.1],
          [0.5, 0]
        )
        .transform({ translate: [0.5, 0], reset: 'pop' }),
    s: () =>
      this.curve(
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
      this.curve([0, 0], [0, 1])
        .curve([0, 0, { translate: [0, 0.65], scale: [0.4, 1] }], [1, 0])
        .slide(0.5)
        .transform({ translate: [0.2, 0], reset: 'pop' }),
    u: () =>
      this.curve(
        [0, 0, { translate: [0, 0.5], scale: [0.5, 0.5] }],
        [0, -1],
        [1, -1],
        [1, 0]
      ).transform({ translate: [0.5, 0], reset: 'pop' }),
    v: () =>
      this.curve(
        [0, 0, { translate: [0, 0.5], scale: [0.5, 0.5] }],
        [0.5, -1, { strength: 1 }],
        [1, 0]
      ).transform({ translate: [0.5, 0], reset: 'pop' }),
    w: () =>
      this.curve(
        [0, 0.5, { scale: [0.7, 1], strength: 1 }],
        [0.25, 0, { strength: 1 }],
        [0.5, 0.5, { strength: 1 }],
        [0.75, 0, { strength: 1 }],
        [1, 0.5, { strength: 1 }]
      ).transform({ translate: [0.7, 0], reset: 'pop' }),
    x: () =>
      this.curve([1, 1, { translate: [0.25, 0.25], scale: 0.25 }], [-1, -1])
        .curve([-1, 1], [1, -1])
        .transform({ translate: [0.5, 0], reset: 'pop' }),
    y: () =>
      this.curve([0, -1, { scale: [0.5, 0.5], translate: [-0.05, 0] }], [1, 1])
        .curve([0.5, 0], [0, 1])
        .transform({ translate: [0.55, 0], reset: 'pop' }),
    z: () =>
      this.curve(
        [0, 1, { scale: 0.5 }],
        [1, 1, { strength: 1 }],
        [0, 0, { strength: 1 }],
        [1, 0]
      ).transform({ translate: [0.5, 0], reset: 'pop' })
  }

  repeat(runCount: number, func: (progress: number, index: number) => void) {
    const div = runCount - 1
    for (let i = 0; i < runCount; i++) {
      func(i / (div || 1), i)
    }

    return this
  }

  reInitialize(resolution: Vector2) {
    this.reset(true)
    this.data = []
    this.h = resolution.y / resolution.x
    this.initialize(this)
    return this.packToTexture()
  }

  constructor(initialize: (builder: GroupBuilder) => GroupBuilder | void) {
    this.initialize = initialize
    this.h = 0
  }
}

export default class Builder {
  groups: GroupBuilder[] = []

  group(render: (g: GroupBuilder) => GroupBuilder | void) {
    this.groups.push(new GroupBuilder(render))
    return this
  }

  repeat(runCount: number, func: (progress: number, index: number) => void) {
    const div = runCount - 1
    for (let i = 0; i < runCount; i++) {
      func(i / (div || 1), i)
    }

    return this
  }

  constructor(initialize: (b: Builder) => Builder) {
    initialize(this)
  }
}
