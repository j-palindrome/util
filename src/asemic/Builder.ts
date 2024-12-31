import _, { last, max, min, range, sum } from 'lodash'
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
import { Jitter } from './Brush'
import { PointBuilder } from './PointBuilder'
import { Fn, vec4 } from 'three/tsl'

const SHAPES: Record<string, Coordinate[]> = {
  circle: [
    [1, 0],
    [1, 0.236],
    [0.707, 0.707],
    [0, 1],
    [-0.707, 0.707],
    [-1, 0],
    [-0.707, -0.707],
    [0, -1],
    [0.707, -0.707],
    [1, -0.236],
    [1, 0]
  ]
}

type TargetInfo = [number, number] | number
export default class Builder {
  protected transformData: TransformData = this.toTransform()
  protected transforms: TransformData[] = []
  protected keyframe: {
    groups: GroupData[]
    transform: TransformData
  } = this.defaultKeyframe()
  protected targetInfo: [number, number] = [0, 0]
  protected initialize: (t: Builder) => Builder | void

  protected defaultKeyframe() {
    return { groups: [], transform: this.toTransform(), settings: {} }
  }

  reset(clear = false) {
    this.transformData.scale = new PointBuilder([1, 1])
    this.transformData.rotate = 0
    this.transformData.translate = new PointBuilder()

    if (clear) this.transforms = []
  }

  protected target(groups?: TargetInfo) {
    const TargetInfo = (from: number, to?: number) => {
      if (from < 0) from += this.keyframe.groups.length
      if (to === undefined) to = from
      else if (to < 0) to += this.keyframe.groups.length
      this.targetInfo = [from, to]
      return this
    }
    if (typeof groups !== 'undefined') {
      if (typeof groups === 'number') TargetInfo(groups)
      else TargetInfo(groups[0], groups[1])
    }
  }

  getPoint(index: number = -1, curve: number = -1, group: number = -1) {
    if (group < 0) group += this.keyframe.groups.length
    if (curve < 0) curve += this.keyframe.groups[group].curves.length

    if (index < 0) index += this.keyframe.groups[group].curves[curve].length
    return this.fromPoint(this.keyframe.groups[group].curves[curve][index])
  }

  getIntersect(progress: number, curve: number = -1, group: number = -1) {
    if (group < 0) group += this.keyframe.groups.length
    if (curve < 0) curve += this.keyframe.groups[group].curves.length
    if (progress < 0) progress += 1

    const curvePath = this.makeCurvePath(
      this.keyframe.groups[group].curves[curve]
    )
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

  getLastPoint(index: number = -1, curve: number = -1, group: number = -1) {
    if (group < 0) group += this.keyframe.groups.length
    if (curve < 0) curve += this.keyframe.groups[group].curves.length

    if (index < 0) {
      index += this.keyframe.groups[group].curves[curve].length
    }

    return this.keyframe.groups[group].curves[curve][index]
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

  protected packToTexture(resolution: Vector2) {
    return this.keyframe.groups.map(group => {
      const hypotenuse = resolution.length()

      this.reset(true)

      const width = max(group.curves.flatMap(x => x.length))!
      const height = group.curves.length
      const dimensions = new Vector2(width, height)
      let curveIndex = 0
      const curveEnds = new Float32Array(group.curves.length)
      const curveIndexes = new Float32Array(group.curves.length)
      const controlPointCounts = new Float32Array(group.curves.length)
      let totalCurveLength = 0
      group.curves.forEach((curve, i) => {
        // shortcut for Bezier lengths
        let curveLength = 0
        for (let i = 1; i < curve.length; i++) {
          curveLength += curve[i - 1].distanceTo(curve[i])
        }

        curveLength *=
          (hypotenuse / 1.414) * (group.transform.scale.length() / 1.414)
        totalCurveLength += curveLength
        curveEnds[i] = totalCurveLength
        curveIndexes[i] = curveIndex
        controlPointCounts[i] = curve.length
        curveIndex++
      })

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

      const keyframesTex = createTexture(
        new Float32Array(
          this.keyframe.groups.flatMap(x =>
            x.curves.flatMap(c =>
              range(width).flatMap(i => {
                return c[i]
                  ? [c[i].x, c[i].y, c[i].strength ?? x.settings.strength, 1]
                  : [0, 0, 0, 0]
              })
            )
          )
        ),
        RGBAFormat,
        LinearFilter
      )

      const colorTex = createTexture(
        new Float32Array(
          this.keyframe.groups.flatMap(group =>
            group.curves.flatMap(c =>
              range(width).flatMap(i => {
                const point = c[i]
                return point
                  ? [
                      ...(point.color ?? group.settings.color),
                      point.alpha ?? group.settings.alpha
                    ]
                  : [0, 0, 0, 0]
              })
            )
          )
        ),
        RGBAFormat,
        LinearFilter
      )

      const thicknessTex = createTexture(
        new Float32Array(
          this.keyframe.groups.flatMap(group =>
            group.curves.flatMap(c =>
              range(width).flatMap(i => {
                const point = c[i]
                return point
                  ? [point.thickness ?? group.settings.thickness]
                  : [0]
              })
            )
          )
        ),
        RedFormat,
        LinearFilter
      )

      return {
        keyframesTex,
        colorTex,
        thicknessTex,
        curveEnds,
        curveIndexes,
        controlPointCounts,
        totalCurveLength,
        dimensions,
        transform: group.transform,
        settings: group.settings
      }
    })
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

  getBounds(points: PointBuilder[], transform?: TransformData) {
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

  along(points: Coordinate[]) {
    const curve = this.makeCurvePath(points.map(x => this.toPoint(x)))
    return this.groups((g, { groupProgress }) => {
      const curveProgress = curve.getPointAt(groupProgress)
      const { min } = this.getBounds(g.curves.flat(), g.transform)
      g.curves.flat().forEach(p => {
        p.add({ x: curveProgress.x - min[0], y: curveProgress.y - min[1] })
      })
    })
  }

  toRad(rotation: number) {
    return rotation * Math.PI * 2
  }

  fromRad(rotation: number) {
    return rotation / Math.PI / 2
  }

  randomize(
    {
      translate,
      rotate,
      scale
    }: {
      translate?: [Coordinate, Coordinate]
      rotate?: [number, number]
      scale?: [Coordinate, Coordinate]
    },
    groups: TargetInfo = [0, -1],
    frames?: TargetInfo
  ) {
    this.groups(g => {
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
      g.curves.flat().forEach(p => {
        this.applyTransform(p, transform)
      })
    }, groups)
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

  points(
    callback: (
      point: PointBuilder,
      {
        groupProgress,
        curveProgress,
        pointProgress
      }: {
        groupProgress: number
        curveProgress: number
        pointProgress: number
      }
    ) => void,
    groups?: TargetInfo
  ) {
    this.target(groups)
    return this.curves((curve, { groupProgress, curveProgress }) => {
      curve.forEach((point, i) =>
        callback(point, {
          groupProgress,
          curveProgress,
          pointProgress: i / curve.length
        })
      )
    })
  }

  curves(
    callback: (
      curve: PointBuilder[],
      {
        groupProgress
      }: {
        groupProgress: number
        curveProgress: number
      }
    ) => void,
    groups?: [number, number] | number
  ) {
    this.target(groups)
    return this.groups((group, { groupProgress }) => {
      group.curves.forEach((curve, i) =>
        callback(curve, {
          groupProgress,
          curveProgress: i / group.curves.length
        })
      )
    })
  }

  groups(
    callback: (
      group: GroupData,
      {
        groupProgress,
        bounds
      }: {
        groupProgress: number
        bounds: ReturnType<Builder['getBounds']>
      }
    ) => void,
    groups?: [number, number] | number
  ) {
    this.target(groups)
    const groupCount = this.keyframe.groups.length

    for (let i = this.targetInfo[0]; i <= this.targetInfo[1]; i++) {
      callback(this.keyframe.groups[i], {
        groupProgress: i / groupCount,
        bounds: this.getBounds(this.keyframe.groups[i].curves.flat())
      })
    }
    return this
  }

  debug(target?: TargetInfo) {
    this.target(target)
    console.log(
      this.keyframe.groups
        .slice(this.targetInfo[0], this.targetInfo[1] + 1)
        .map(
          g =>
            `*${g.transform.scale.toArray().map(x => x.toFixed(2))} @${
              g.transform.rotate / Math.PI / 2
            } +${g.transform.translate.toArray().map(x => x.toFixed(2))}
${g.curves
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
        .join('\n\n')
    )
    return this
  }

  within(from: Coordinate, to: Coordinate, groups?: [number, number] | number) {
    this.target(groups)
    const fromV = this.toPoint(from)
    const size = new Vector2().copy(this.toPoint(to)).sub(fromV)

    this.groups(g => {
      const curves = g.curves.flat()
      const bounds = this.getBounds(curves)
      curves.forEach(p => {
        p.sub(bounds.min).divide(bounds.size).multiply(size).add(fromV)
      })
    })

    return this
  }

  protected lastGroup(callback: (group: GroupData) => void) {
    callback(last(this.keyframe.groups)!)
    return this
  }

  protected lastCurve(callback: (curve: PointBuilder[]) => void) {
    return this.lastGroup(g => callback(last(g.curves)!))
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

  newGroup(settings?: Partial<GroupData['settings']>) {
    this.keyframe.groups.push({
      curves: [],
      transform: this.toTransform(settings),
      settings: {
        strength: 0,
        thickness: 1,
        color: [1, 1, 1],
        alpha: 1,
        spacing: 1,
        recalculate: false,
        pointVert: input => input,
        pointFrag: input => input,
        curveVert: input => input,
        curveFrag: input => input,
        ...settings
      }
    })
    this.target(-1)
    return this
  }

  newCurve(...points: (Coordinate | PointBuilder)[]) {
    this.groups(g => {
      g.curves.push([])
    })
    this.lastCurve(c => c.push(...this.toPoints(...points)))
    return this
  }

  newPoints(...points: (Coordinate | PointBuilder)[]) {
    return this.lastCurve(c => c.push(...this.toPoints(...points)))
  }

  length(copyCount: number) {
    return this.lastCurve(curve =>
      curve.push(...range(copyCount).map(() => curve[0].clone()))
    )
  }

  text(str: string, warp?: CoordinateData) {
    let lineCount = 0
    if (warp) this.transform(warp)
    for (let letter of str) {
      if (this.letters[letter]) {
        this.setTransform({
          scale: [window.innerHeight / window.innerWidth, 1]
        })
        this.transform({ translate: [0.1, 0], push: true }).newGroup()
        this.letters[letter]()
      } else if (letter === '\n') {
        lineCount++

        this.transform({
          reset: true,
          translate: [0, -1.1 * lineCount]
        })
      }
    }

    const maxX = max(
      this.keyframe.groups.map(g => {
        return this.getBounds(g.curves.flat(), g.transform).max.x
      })
    )!

    this.lastGroup(group => {
      group.transform.translate.multiplyScalar(1 / maxX)
      group.transform.scale.multiplyScalar(1 / maxX)
    })
    return this
  }

  setTransform(transform: CoordinateData) {
    const transformed = this.toTransform(transform)
    if (transform.scale) this.transformData.scale = transformed.scale
    if (transform.rotate) this.transformData.rotate = transformed.rotate
    if (transform.translate)
      this.transformData.translate = transformed.translate
    return this
  }

  transform(transform: CoordinateData) {
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
        case 'group':
          this.transformData = this.cloneTransform(
            last(this.keyframe.groups)?.transform ?? this.toTransform()
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

  newShape(type: keyof typeof SHAPES, transform?: PreTransformData) {
    if (transform) this.transform(transform)
    return this.lastCurve(c => {
      c.push(...SHAPES[type].map(x => this.toPoint(x)))
    })
  }

  protected letters: Record<string, () => Builder> = {
    ' ': () => this.transform({ translate: [0.5, 0], push: true }),
    '\t': () => this.transform({ translate: [2, 0], push: true }),
    a: () =>
      this.newCurve([1, 1], [0.5, 1.3], [0, 0.5], [0.5, -0.3], [1, 0])
        .newCurve([0, 1, { translate: [1, 0] }], [-0.1, 0.5], [0, -0.3])
        .slide(0.1)
        .within([0, 0, { reset: 'last' }], [0.5, 0.6])
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
        .within([0, 0, { reset: 'last' }], [0.5, 1])
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
        .within([0, 0, { reset: 'last' }], [0.5, 0.5])
        .transform({ translate: [0.5, 0], reset: 'last' }),
    d: () =>
      this.newCurve([1, 1], [1, 0])
        .newCurve(
          [0, 1, { scale: [-0.5, 0.5], translate: [1, 0] }],
          [0.5, 1.1],
          [1, 0.5],
          [0.5, -0.1],
          [0, 0]
        )
        .within([0, 0, { reset: 'last' }], [0.5, 1])
        .transform({ translate: [0.5, 0] }),
    e: () =>
      this.newCurve([0, 0.5], [1, 0.5])
        .newCurve([1, 0.5], [1, 1], [0, 1], [0, 0], [0.9, 0], [1, 0.2])
        .within([0, 0, { reset: 'last' }], [0.5, 0.5])
        .transform({ translate: [0.5, 0] }),
    f: () =>
      this.newCurve([0, 0], [0, 1 / 2], [0, 1], [1 / 2, 1], [1 / 2, 0.75])
        .newCurve([0, 1 / 2], [1 / 2, 1 / 2])
        .slide(1 / 4)
        .within([0, 0, { reset: 'last' }], [1 / 2, 1])
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
        .within([0, -0.5], [0.5, 0.5])
        .transform({ translate: [0.5, 0] }),
    h: () =>
      this.newCurve([0, 0], [0, 1])
        .newCurve([0, 0.6, { scale: [0.5, 0.7] }], [1, 1], [1, 0])
        .transform({ translate: [0.5, 0], reset: 'last' }),
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
        .transform({ translate: [0.2, 0], reset: 'last' }),
    j: () =>
      this.transform({ translate: [-0.25, 0] })
        .newCurve(
          [0, 0, { translate: [1, 1], scale: [0.7, 1], rotate: 0.05 }],
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
        .within([0, -0.5, { reset: 'last' }], [0.5, 0.5])
        .transform({ translate: [0.5, 0], reset: 'last' }),
    k: () =>
      this.newCurve([0, 1], [0, 0])
        .newCurve(
          [0, 0, { translate: this.getIntersect(0.6), push: true }],
          [0.3, 0, { rotate: 0.15 }]
        )
        .newCurve([0, 0, { reset: 'pop' }], [0.3, 0, { reset: 'last' }])
        .within([0, 0], [0.5, 1])
        .transform({ translate: [0.5, 0] }),
    l: () =>
      this.newCurve([0, 1], [0, 0.2], [0, 0], [0.1, 0]).transform({
        translate: [0.2, 0]
      }),
    m: () =>
      this.newCurve([0, 0, { scale: [0.5, 0.5] }], [0, 1], [1, 1], [1, 0])
        .newCurve([0, 0, { translate: [1, 0] }], [0, 1], [1, 1], [1, 0])
        .transform({ translate: [1, 0], reset: 'last' }),
    n: () =>
      this.newCurve(
        [0, 0, { scale: [0.5, 0.5] }],
        [0, 1],
        [1, 1],
        [1, 0]
      ).transform({ translate: [0.5, 0], reset: 'last' }),
    o: () =>
      this.newCurve()
        .newShape('circle', { scale: [0.2, 0.25], translate: [0.25, 0.25] })
        .transform({ reset: 'last', translate: [0.5, 0] }),
    p: () =>
      this.newCurve([0, 0, { translate: [0, -0.5] }], [0, 1])
        .newCurve(
          [0, 1, { reset: 'last', scale: 0.5 }],
          [1, 1.3],
          [1, -0.3],
          [0, 0]
        )
        .within([0, -0.5, { reset: 'last' }], [0.5, 0.5])
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
        .within([0, -0.5, { reset: 'last' }], [0.5, 0.5])
        .transform({ translate: [0.5, 0] }),
    r: () =>
      this.newCurve([0, 0], [0, 0.5])
        .newCurve(
          [0, 0, { translate: this.getIntersect(0.9) }],
          [0.25, 0.1],
          [0.5, 0]
        )
        .transform({ translate: [0.5, 0], reset: 'last' }),
    s: () =>
      this.newCurve(
        [0.5, 1],
        [0.2, 1],
        [0.2, 0.6],
        [0.5, 0.6],
        [1, 0.6],
        [1, 0],
        [0.5, 0]
      )
        .within([0, 0], [0.5, 0.5])
        .transform({ translate: [0.5, 0], reset: 'last' }),
    t: () =>
      this.newCurve([0, 0], [0, 1])
        .newCurve([0, 0, { translate: [0, 0.65], scale: [0.4, 1] }], [1, 0])
        .slide(0.5)
        .transform({ translate: [0.2, 0], reset: 'last' }),
    u: () =>
      this.newCurve(
        [0, 0, { translate: [0, 0.5], scale: [0.5, 0.5] }],
        [0, -1],
        [1, -1],
        [1, 0]
      ).transform({ translate: [0.5, 0], reset: 'last' }),
    v: () =>
      this.newCurve(
        [0, 0, { translate: [0, 0.5], scale: [0.5, 0.5] }],
        [0.5, -1, { strength: 1 }],
        [1, 0]
      ).transform({ translate: [0.5, 0], reset: 'last' }),
    w: () =>
      this.newCurve(
        [0, 0, { translate: [0, 0.5], scale: [0.4, 0.7] }],
        [0.5, -1, { strength: 1 }],
        [0, 0, { translate: [0.5, 0], strength: 1 }],
        [0.5, -1, { strength: 1 }],
        [1, 0]
      ).transform({ translate: [0.8, 0], reset: 'last' }),
    x: () =>
      this.newCurve([1, 1, { translate: [0.25, 0.25], scale: 0.25 }], [-1, -1])
        .newCurve([-1, 1], [1, -1])
        .transform({ translate: [0.5, 0], reset: 'last' }),
    y: () =>
      this.newCurve([0, -1, { scale: [0.5, 0.5] }], [1, 1])
        .newCurve([0.5, 0], [0, 1])
        .transform({ translate: [0.5, 0], reset: 'last' }),
    z: () =>
      this.newCurve(
        [0, 1, { scale: 0.5 }],
        [1, 1, { strength: 1 }],
        [0, 0, { strength: 1 }],
        [1, 0]
      ).transform({ translate: [0.5, 0], reset: 'last' })
  }

  repeat(func: (progress: number) => void, runCount = 1) {
    for (let i = 0; i < runCount; i++) {
      func(i)
    }

    return this
  }

  setWarpGroups(
    groups: (PreTransformData & CoordinateSettings)[],
    target?: TargetInfo
  ) {
    this.target(target)
    const transforms = groups.map(x => this.toTransform(x))
    return this.groups((g, { groupProgress }) => {
      this.combineTransforms(
        g.transform,
        this.getTransformAt(transforms, groupProgress)
      )
    })
  }

  parse(value: string) {
    let parsed = value
    const matchString = (match: RegExp, string: string) => {
      const find = string.match(match)?.[1] ?? ''
      return find
    }

    const detectRange = <T extends number | Coordinate>(
      range: string,
      callback: (string: string) => T
    ): T => {
      if (range.includes('~')) {
        const p = range.split('~')
        let r = p.map(c => callback(c))
        if (r[0] instanceof Array) {
          invariant(r instanceof Array)
          const points = r.map(x => this.toPoint(x as Coordinate))
          if (points.length === 2) {
            return new Vector2()
              .lerpVectors(points[0], points[1], Math.random())
              .toArray() as T
          } else {
            return this.makeCurvePath(points)
              .getPoint(Math.random())
              .toArray() as T
          }
        } else if (typeof r[0] === 'number') {
          if (r.length === 2) {
            return lerp(r[0], r[1] as number, Math.random()) as T
          } else {
            return this.makeCurvePath(
              r.map(x => this.toPoint([x as number, 0]))
            ).getPoint(Math.random()).x as T
          }
        }
      }
      return callback(range)
    }

    const parseCoordinate = (
      c: string,
      defaultArg: 'same' | number = 'same'
    ): Coordinate | undefined => {
      if (!c) return undefined
      return detectRange(c, c => {
        if (!c.includes(',')) {
          return [
            parseNumber(c)!,
            defaultArg === 'same' ? parseNumber(c)! : defaultArg
          ] as [number, number]
        } else {
          // if (c[2]) {
          //   const translate = parseCoordinate(
          //     matchString(/\+([\-\d\.,\/~]+)/, c[2])
          //   )
          //   const scale = parseCoordinate(
          //     matchString(/\*([\-\d\.,\/~]+)/, c[2])
          //   )
          //   const rotate = parseNumber(matchString(/@([\-\d\.\/~]+)/, c[2]))
          // }
          return c.split(',', 2).map(x => parseNumber(x)) as [number, number]
        }
      })
    }

    const parseNumber = (coordinate: string): number | undefined => {
      if (!coordinate) return undefined
      return detectRange(coordinate, c => {
        if (c.includes('/')) {
          const split = c.split('/')
          return Number(split[0]) / Number(split[1])
        }
        return Number(c)
      })
    }

    const parseArgs = (name: string, argString: string) => {
      const args = argString.split(' ')
    }

    const parseCoordinateList = (
      argString: string,
      defaultArg: 'same' | number = 'same'
    ) =>
      !argString
        ? undefined
        : argString.split(' ').map(x => parseCoordinate(x, defaultArg)!)

    const text = matchString(/(.*?)( [\+\-*@]|$|\{)/, parsed)
    parsed = parsed.replace(text, '')
    this.text(text)

    const translate = parseCoordinate(
      matchString(/ \+([\-\d\.,\/~]+)/, parsed)
    ) as [number, number]
    const scale = parseCoordinate(
      matchString(/ \*([\-\d\.,\/~]+)/, parsed)
    ) as [number, number]
    const rotate = parseNumber(matchString(/ @([\-\d\.\/~]+)/, parsed))
    const thickness = parseNumber(
      matchString(/ (?:t|thickness):([\-\d\.\/~]+)/, parsed)
    )

    this.setGroup({ thickness, translate, scale, rotate }, -1)
    this.lastGroup(group =>
      this.combineTransforms(
        group.transform,
        this.toTransform({ translate, scale, rotate })
      )
    )

    const groupTranslate = parseCoordinateList(
      matchString(/ \+\[([\-\d\.\/ ]+)\]/, parsed)
    )
    const groupScale = parseCoordinateList(
      matchString(/ \*\[([\-\d\.\/ ]+)\]/, parsed)
    )
    const groupRotate = parseCoordinateList(
      matchString(/ @\[([\-\d\.\/ ]+)\]/, parsed),
      0
    )

    if (groupTranslate || groupScale || groupRotate) {
      const translationPath = groupTranslate
        ? this.makeCurvePath(groupTranslate.map(x => this.toPoint(x)))
        : undefined
      const rotationPath = groupRotate
        ? this.makeCurvePath(
            groupRotate.map(x => new PointBuilder([this.toRad(x[0]), 0]))
          )
        : undefined
      const scalePath = groupScale
        ? this.makeCurvePath(groupScale.map(x => this.toPoint(x)))
        : undefined
      this.groups(
        (g, { groupProgress }) => {
          this.combineTransforms(g.transform, {
            translate: new PointBuilder().copy(
              translationPath?.getPoint(groupProgress) ?? new Vector2(0, 0)
            ),
            scale: new PointBuilder().copy(
              scalePath?.getPoint(groupProgress) ?? new Vector2(1, 1)
            ),
            rotate: rotationPath?.getPoint(groupProgress).x ?? 0
          })
        },
        [0, -1]
      )
    }

    const functionMatch = /\\(\w+) ([^\\]*?)/
    let thisCall = parsed.match(functionMatch)
    while (thisCall) {
      // TODO: create a function to parse arguments
      let name = thisCall[1]
      let args = thisCall[2]
      // if (!parseArgs[name]) throw new Error(`Unknown function ${name}`)
      parsed = parsed.replace(functionMatch, '')
      thisCall = parsed.match(functionMatch)
    }

    return this
  }

  setGroup(settings?: Partial<GroupData['settings']>, target?: TargetInfo) {
    this.target(target)
    const transformData = this.toTransform(settings)
    return this.groups(g => {
      Object.assign(g.settings, settings)
      this.combineTransforms(g.transform, transformData)
    })
  }

  reInitialize(resolution: Vector2) {
    this.reset(true)
    this.target([0, 0])
    this.keyframe = this.defaultKeyframe()
    this.initialize(this)
    return this.packToTexture(resolution)
  }

  constructor(initialize: (builder: Builder) => Builder | void) {
    this.initialize = initialize
  }
}
