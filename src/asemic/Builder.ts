import { ElemNode } from '@elemaudio/core'
import WebAudioRenderer from '@elemaudio/web-renderer'
import _, { entries, keys, last, max, min, range, sum } from 'lodash'
import { createNoise2D, createNoise3D, createNoise4D } from 'simplex-noise'
import { CurvePath, LineCurve, QuadraticBezierCurve, Vector2 } from 'three'
import { mrt, output, pass, ShaderNodeObject, texture } from 'three/tsl'
import { Node, PassNode, PostProcessing, TextureNode } from 'three/webgpu'
import invariant from 'tiny-invariant'
import { lerp } from '../math'
import { multiBezierJS } from '../shaders/bezier'
import { PointBuilder } from './PointBuilder'
import { isTransformData } from './typeGuards'
import { Settings, SettingsInput } from './util/useEvents'

export const defaultCoordinateSettings: CoordinateSettings = {
  strength: 0,
  alpha: 1,
  color: [1, 1, 1],
  thickness: 1
}

abstract class Builder {
  protected transforms: TransformData[] = []
  currentTransform: TransformData = this.toTransform()
  pointSettings: PreTransformData & CoordinateData = defaultCoordinateSettings
  protected noiseFuncs: ((...args: any[]) => number)[] = []
  protected randomTable: number[] = []
  protected hashIndex: number = 0
  protected noiseIndex: number = 0

  repeatGrid(
    dimensions: [number, number],
    func: ({
      p,
      i,
      count
    }: {
      p: [number, number]
      i: [number, number]
      count: [number, number]
    }) => void
  ) {
    for (let y = 0; y < dimensions[1]; y++) {
      for (let x = 0; x < dimensions[0]; x++) {
        func({
          p: [x / dimensions[0], y / dimensions[1]],
          i: [x, y],
          count: [dimensions[0], dimensions[1]]
        })
      }
    }

    return this
  }

  repeat(
    runCount: number,
    func: ({ p, i, count }: { p: number; i: number; count: number }) => void,
    complete = true
  ) {
    for (let i = 0; i < runCount; i++) {
      func({
        p: complete ? i / (runCount - 1 || 1) : i / runCount,
        i,
        count: runCount
      })
    }

    return this
  }

  protected reset(clear = false) {
    this.currentTransform = this.toTransform()
    this.pointSettings = { ...defaultCoordinateSettings }

    if (clear) this.transforms = []
    return this
  }

  transform(transform: Partial<CoordinateData>) {
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

  applyTransform<T extends Vector2>(
    vector: T,
    transformData: TransformData | PreTransformData,
    invert: boolean = false
  ): T {
    transformData = this.toTransform(transformData)
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
      translate: transform.translate.clone(),
      isTransformData: true
    }
  }

  protected toTransform(
    transform?: PreTransformData | TransformData
  ): TransformData {
    if (isTransformData(transform)) return transform
    if (!transform) {
      return {
        scale: new Vector2(1, 1),
        rotate: 0,
        translate: new Vector2(),
        isTransformData: true
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
          : transform.translate ?? new Vector2(),
      isTransformData: true
    }
  }

  getAlong(t: number, ...curve: (Vector2 | Coordinate)[]) {
    return multiBezierJS(
      t,
      ...curve.map(x => (x instanceof Array ? new Vector2(x[0], x[1]) : x))
    )
  }

  protected toRad(rotation: number) {
    return rotation * Math.PI * 2
  }

  protected fromRad(rotation: number) {
    return rotation / Math.PI / 2
  }

  getRange(input: number, bounds: [number, number], exponent: number = 1) {
    return input ** exponent * (bounds[1] - bounds[0]) + bounds[0]
  }

  /**
   * i: int 1-100
   */
  hash(i?: number) {
    if (i === undefined) {
      this.hashIndex++
      i = this.hashIndex
    }

    if (!this.randomTable[i]) this.randomTable.push(Math.random())

    return this.randomTable[i]
  }

  noise(
    coords:
      | [number, number]
      | [number, number, number]
      | [number, number, number, number],
    { signed = false }: { index?: number | string; signed?: boolean } = {}
  ) {
    if (!this.noiseFuncs[this.noiseIndex]) {
      switch (coords.length) {
        case 2:
          this.noiseFuncs.push(createNoise2D())
          break
        case 3:
          this.noiseFuncs.push(createNoise3D())
          break
        case 4:
          this.noiseFuncs.push(createNoise4D())
          break
      }
    }
    const noise = this.noiseFuncs[this.noiseIndex](...coords)
    this.noiseIndex++
    return signed ? noise : (noise + 1) / 2
  }

  constructor() {}
}

export class GroupBuilder<
  T extends BrushTypes,
  K extends Record<string, any>
> extends Builder {
  time: number = performance.now() / 1000
  curves: PointBuilder[][] = []
  params: K
  settings: ProcessData<T, K> & BrushData<T> = {
    maxLength: 0,
    maxCurves: 0,
    maxPoints: 0,
    align: 0.5,
    resample: true,
    renderInit: false,
    renderStart: 0,
    renderUpdate: false,
    spacing: 3,
    spacingType: 'pixel',
    adjustEnds: true,
    renderTargets: mrt({
      output
    }),
    pointProgress: input => input,
    pointPosition: input => input,
    pointColor: input => input,
    curvePosition: input => input,
    curveColor: input => input,
    pointRotate: input => input,
    pointThickness: input => input,
    onUpdate: () => {},
    onInit: () => {}
  } as any

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
        this.transform(coordinates[i] as CoordinateSettings)
      }
    }
    return points
  }

  protected convertPointSettings(): CoordinateSettings {
    const newPointSettings: CoordinateSettings = {} as any
    for (let [key, value] of entries(this.pointSettings)) {
      if (typeof value === 'function') {
        newPointSettings[key] = value()
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
        this.convertPointSettings()
      )
    else {
      if (coordinate[2]) {
        this.transform(coordinate[2])
      }
      return this.applyTransform(
        new PointBuilder(
          [coordinate[0], coordinate[1]],
          this.convertPointSettings()
        ),
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

      return curveInterpolate(groups as any)
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

  newShape(divisions: 3 | 4 | 5 | 6 | 7 | 8, transform?: CoordinateData) {
    let shape
    switch (divisions) {
      case 6:
        shape = [
          [0, 0],
          [0.5, 0],
          [0.5, 1],
          [-0.5, 1],
          [-0.5, 0],
          [0, 0]
        ]
        break
      case 7:
        shape = [
          [0, 0],
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
    if (shape) {
      if (transform) {
        this.transform(transform)
      }
      this.newCurve(...shape)
    }
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

  protected letters: Record<string, () => GroupBuilder<T, K>> = {
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
        [0, 1, { scale: 0.5, strength: 1 }],
        [1, 1, { strength: 1 }],
        [0, 0, { strength: 1 }],
        [1, 0]
      ).transform({ translate: [0.5, 0], reset: 'pop' })
    // this.newCurve([0, 1], [0, 0.2], [0, 0], [0.1, 0]).transform({
    //   translate: [0.2, 0],
    //   reset: 'pop'
    // })
  }

  reInitialize(seconds: number) {
    this.time = seconds
    this.reset(true)
    this.hashIndex = 0
    this.noiseIndex = 0
    this.settings.onInit(this)
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

  clear() {
    this.curves.splice(0, this.curves.length)
    return this
  }

  constructor(
    type: T,
    settings: Partial<ProcessData<T, K>> & Partial<BrushData<T>>,
    params: K
  ) {
    super()

    const defaultBrushSettings: { [T in BrushTypes]: BrushData<T> } = {
      line: { type: 'line' },
      dash: {
        type: 'dash',
        dashSize: 10
      },
      particles: {
        type: 'particles',
        speedDamping: 1e-3,
        initialSpread: true,
        speedMax: 1,
        speedMin: 0,
        particleSize: 1,
        particleVelocity: input => input,
        particlePosition: input => input,
        attractorPull: 0,
        attractorPush: 1,
        particleCount: 1e4
      },
      stripe: { type: 'stripe' },
      blob: { type: 'blob', centerMode: 'center' }
    }

    this.settings = {
      ...this.settings,
      ...defaultBrushSettings[type],
      ...settings
    }
    this.params = params

    this.reInitialize(0)
  }
}

type BuilderGlobals = Pick<SceneBuilder<any>, 'postProcessing' | 'audio' | 'h'>

export default class SceneBuilder<T extends SettingsInput> extends Builder {
  // groups: GroupBuilder<any>[] = []
  mouse = new Vector2()
  click = new Vector2()
  text = ''
  keys: string[] = []
  postProcessing: {
    postProcessing: PostProcessing
    scenePass: ReturnType<typeof pass>
    readback: ReturnType<typeof texture> | null
  }
  audio: {
    ctx: AudioContext
    elNode: AudioWorkletNode
    elCore: WebAudioRenderer
  } | null
  h: number
  constants: Settings<T>['constants']
  refs: Settings<T>['refs']
  uniforms: Settings<T>['uniforms']

  sceneSettings: {
    postProcessing: (
      input: ShaderNodeObject<TextureNode>,
      info: {
        scenePass: BuilderGlobals['postProcessing']['scenePass']
        readback: BuilderGlobals['postProcessing']['readback']
      }
    ) => ShaderNodeObject<any>
    audio: (() => ElemNode | [ElemNode, ElemNode]) | null
    useReadback: boolean
  } = {
    postProcessing: input => input,
    useReadback: false,
    audio: null
  }

  constructor(
    sceneSettings: Partial<SceneBuilder<T>['sceneSettings']>,
    globals: BuilderGlobals,
    controls: Settings<T>
  ) {
    super()
    Object.assign(this.sceneSettings, sceneSettings)
    this.constants = controls.constants
    this.refs = controls.refs
    this.uniforms = controls.uniforms
    this.audio = globals.audio
    this.postProcessing = globals.postProcessing
    this.h = globals.h
  }
}
