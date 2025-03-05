import _, { entries, last, max, min, range } from 'lodash'
import {
  CurvePath,
  LineCurve,
  QuadraticBezierCurve,
  Scene,
  Vector2,
  Vector4,
} from 'three'
import { lerp } from 'three/src/math/MathUtils.js'
import {
  atan,
  float,
  floor,
  If,
  instancedArray,
  instanceIndex,
  int,
  mix,
  mrt,
  output,
  screenSize,
  select,
  uniformArray,
  varying,
  vec2,
  vec4,
} from 'three/tsl'
import invariant from 'tiny-invariant'
import { Builder } from './Builder'
import { PointBuilder } from './PointBuilder'
import { WebGPURenderer } from 'three/src/Three.WebGPU.js'
import { Fn } from 'three/src/nodes/TSL.js'
import { bezierPosition, bezierRotation } from '../util/bezier'

export abstract class BrushBuilder<
  T extends BrushTypes,
  K extends Record<string, any>,
> extends Builder {
  time: number = performance.now() / 1000
  curves: PointBuilder[][] = []
  params: K
  settings: ProcessData<T, K> & BrushData<T>
  lastIndex: number = 0
  scene: Scene
  renderer: WebGPURenderer
  data: Record<string, any> = {}

  abstract render(): void

  abstract onDispose(): void

  protected useControlPointArray() {
    const curvePositionArray = instancedArray(
      this.settings.maxPoints * this.settings.maxCurves,
      'vec4',
    )
    const curveColorArray = instancedArray(
      this.settings.maxPoints * this.settings.maxCurves,
      'vec4',
    )
    this.data.curvePositionArray = curvePositionArray
    this.data.curveColorArray = curveColorArray

    const loadPositions = uniformArray(
      range(this.settings.maxPoints * this.settings.maxCurves).map(
        (x) => new Vector4(),
      ),
      'vec4',
    )
    const loadColors = uniformArray(
      range(this.settings.maxPoints * this.settings.maxCurves).map(
        (x) => new Vector4(),
      ),
      'vec4',
    )
    const controlPointCounts = uniformArray(
      this.curves.map((x) => x.length),
      'int',
    )

    const pointI = instanceIndex.modInt(this.settings.maxPoints)
    const curveI = instanceIndex.div(this.settings.maxPoints)

    const advanceControlPoints = Fn(() => {
      const info = {
        progress: curveI
          .toFloat()
          .add(pointI.toFloat().div(controlPointCounts.element(curveI).sub(1))),
        builder: this,
      }
      const index = curveI.mul(this.settings.maxPoints).add(pointI)
      const thisPosition = loadPositions.element(index)

      curvePositionArray.element(index).assign(
        this.settings.curvePosition(thisPosition, {
          ...info,
          lastFrame: curvePositionArray.element(index),
        }),
      )
      const thisColor = loadColors.element(index)
      curveColorArray.element(index).assign(
        this.settings.curveColor(thisColor, {
          ...info,
          lastFrame: curveColorArray.element(index),
        }),
      )
    })().compute(this.settings.maxPoints * this.settings.maxCurves)

    let nextTime = {
      current:
        (typeof this.settings.renderStart === 'function'
          ? this.settings.renderStart()
          : this.settings.renderStart) / 1000,
    }

    const startTime = performance.now()
    const frame = () => {
      updateTime(performance.now() - startTime)
      window.requestAnimationFrame(frame)
    }
    window.requestAnimationFrame(frame)

    const updateTime = (time: number) => {
      if (time > nextTime.current) {
        if (this.settings.renderInit) {
          const r = this.settings.renderInit
          nextTime.current =
            typeof r === 'boolean'
              ? time + 1 / 60
              : typeof r === 'number'
                ? time + r / 1000
                : time + r(nextTime.current * 1000) / 1000
          reInitialize(time)
        }
      }
      update()
    }

    this.reInitialize(nextTime.current)

    const hooks: { onUpdate?: () => void; onInit?: () => void } = {}
    const update = () => {
      if (hooks.onUpdate) {
        hooks.onUpdate()
      }
      this.renderer.compute(advanceControlPoints)
    }

    const reInitialize = (seconds: number) => {
      if (this.settings.renderClear) this.clear()
      this.reInitialize(seconds)
      reload()
      if (hooks.onInit) {
        hooks.onInit()
      }
    }

    const loadControlPoints = Fn(() => {
      curvePositionArray
        .element(instanceIndex)
        .assign(loadPositions.element(instanceIndex))
      curveColorArray
        .element(instanceIndex)
        .assign(loadColors.element(instanceIndex))
    })().compute(this.settings.maxCurves * this.settings.maxPoints)

    const reload = () => {
      for (let i = 0; i < this.settings.maxCurves; i++) {
        controlPointCounts.array[i] = this.curves[i].length
      }
      const loadColorsArray = loadColors.array as Vector4[]
      const loadPositionsArray = loadPositions.array as Vector4[]
      for (let i = 0; i < this.settings.maxCurves; i++) {
        const curveIndex = i * this.settings.maxPoints
        for (let j = 0; j < this.settings.maxPoints; j++) {
          const point = this.curves[i]?.[j]
          if (point) {
            loadPositionsArray[curveIndex + j].set(
              point.x,
              point.y,
              point.strength,
              point.thickness,
            )
            loadColorsArray[curveIndex + j].set(
              point.color[0],
              point.color[1],
              point.color[2],
              point.alpha,
            )
          } else {
            loadPositionsArray[curveIndex + j].set(0, 0, 0, 0)
            loadColorsArray[curveIndex + j].set(0, 0, 0, 0)
          }
        }
      }

      this.renderer.compute(loadControlPoints)
    }

    return {
      curvePositionArray,
      curveColorArray,
      controlPointCounts,
      hooks,
    }
  }

  useCurve() {
    const size = this.renderer.getDrawingBufferSize(new Vector2())

    const { curvePositionArray, curveColorArray, controlPointCounts, hooks } =
      this.useControlPointArray()

    const instancesPerCurve = Math.max(
      1,
      Math.floor(
        this.settings.spacingType === 'pixel'
          ? (this.settings.maxLength * size.width) / this.settings.spacing
          : this.settings.spacingType === 'width'
            ? (this.settings.maxLength * size.width) /
              (this.settings.spacing * size.width)
            : this.settings.spacingType === 'count'
              ? this.settings.spacing
              : 0,
      ),
    )

    const getBezier = (
      progress: ReturnType<typeof float>,
      position: ReturnType<typeof vec2>,
      extra?: {
        rotation?: ReturnType<typeof float>
        thickness?: ReturnType<typeof float>
        color?:
          | ReturnType<typeof varying>
          | ReturnType<ReturnType<typeof float>['toVar']>
        progress?: ReturnType<typeof varying>
      },
    ) => {
      const progressVar = progress.toVar()
      If(progressVar.equal(-1), () => {
        extra?.color?.assign(vec4(0, 0, 0, 0))
      }).Else(() => {
        progressVar.assign(
          floor(progress).add(
            this.settings.pointProgress(progress.fract(), {
              builder: this,
              progress,
            }),
          ),
        )
        extra?.progress?.assign(progressVar)
        const controlPointsCount = controlPointCounts.element(int(progressVar))
        const subdivisions = select(
          controlPointsCount.equal(2),
          1,
          this.settings.adjustEnds === 'loop'
            ? controlPointsCount
            : controlPointsCount.sub(2),
        ).toVar()

        //4 points: 4-2 = 2 0->1 1->2 (if it goes to the last value then it starts interpolating another curve)
        const t = vec2(
          progressVar.fract().mul(0.999).mul(subdivisions),
          floor(progressVar),
        )
        const curveIndex = floor(progressVar).mul(this.settings.maxPoints)
        const pointIndex = progressVar.fract().mul(0.999).mul(subdivisions)
        const index = curveIndex.add(pointIndex).toVar()

        If(controlPointsCount.equal(2), () => {
          const p0 = curvePositionArray.element(index)
          const p1 = curvePositionArray.element(index.add(1))
          const progressPoint = mix(p0, p1, t.x)

          position.assign(progressPoint.xy)
          if (extra) {
            const index = t.y.mul(this.settings.maxPoints).add(t.x)
            extra.color?.assign(curveColorArray.element(index))
            extra.thickness?.assign(progressPoint.w)
            const rotationCalc = p1.xy.sub(p0.xy).toVar()
            extra.rotation?.assign(atan(rotationCalc.y, rotationCalc.x))
          }
        }).Else(() => {
          const p0 = curvePositionArray.element(index).toVar()
          const p1 = curvePositionArray
            .element(curveIndex.add(pointIndex.add(1).mod(controlPointsCount)))
            .toVar()
          const p2 = curvePositionArray
            .element(curveIndex.add(pointIndex.add(2).mod(controlPointsCount)))
            .toVar()

          if (this.settings.adjustEnds === true) {
            If(t.x.greaterThan(float(1)), () => {
              p0.assign(mix(p0, p1, float(0.5)))
            })
            If(t.x.lessThan(float(controlPointsCount).sub(3)), () => {
              p2.assign(mix(p1, p2, 0.5))
            })
          } else {
            p0.assign(mix(p0, p1, float(0.5)))
            p2.assign(mix(p1, p2, 0.5))
          }

          const strength = p1.z
          const pos = bezierPosition({
            t: t.x.fract(),
            p0: p0.xy,
            p1: p1.xy,
            p2: p2.xy,
            strength,
          })

          position.assign(pos)
          const c0 = curveColorArray.element(index)
          const c1 = curveColorArray.element(index.add(1))
          if (extra) {
            extra.color?.assign(mix(c0, c1, t.x.fract()))
            extra.thickness?.assign(
              bezierPosition({
                t: t.x.fract(),
                p0: vec2(0, p0.w),
                p1: vec2(0.5, p1.w),
                p2: vec2(1, p2.w),
                strength,
              }).y,
            )
            extra.rotation?.assign(
              bezierRotation({
                t: t.x.fract(),
                p0: p0.xy,
                p1: p1.xy,
                p2: p2.xy,
                strength,
              }),
            )
          }
        })
      })
      if (extra) {
        extra.thickness?.assign(
          this.settings
            .pointThickness(extra.thickness, {
              progress: progressVar,
              builder: this,
            })
            .div(screenSize.x),
        )
        extra.rotation?.assign(
          this.settings.pointRotate(extra.rotation!, {
            progress: extra.progress!,
            builder: this,
          }),
        )
      }
    }

    return {
      getBezier,
      instancesPerCurve,
      hooks,
    }
  }

  dispose() {
    this.data.curvePositionArray?.dispose()
    this.data.curveColorArray?.dispose()
    this.onDispose()
  }

  getWave(
    frequency: number = 1,
    {
      waveshape = 'sine',
      signed = false,
    }: { waveshape?: 'sine' | 'saw'; signed?: boolean } = {},
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
      harmonics = 1,
    }: { index?: number; signed?: boolean; harmonics?: number } = {},
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

  protected getPointSettings(): CoordinateSettings {
    const newPointSettings: CoordinateSettings = {} as any
    for (let [key, value] of entries(this.pointSettings)) {
      if (typeof value === 'function') {
        newPointSettings[key] = value([
          last(this.curves)?.length ?? 0,
          this.curves.length,
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
        this.getPointSettings(),
      )
    else {
      if (coordinate[2]) {
        this.transform(coordinate[2])
      }
      return this.applyTransform(
        new PointBuilder(
          [coordinate[0], coordinate[1]],
          this.getPointSettings(),
        ),
        this.currentTransform,
      )
    }
  }

  protected interpolateCurve(
    curve: PointBuilder[],
    controlPointsCount: number,
  ) {
    const newCurve = this.makeCurvePath(curve)

    const newCurvePoints: PointBuilder[] = []
    for (let i = 0; i < controlPointsCount; i++) {
      const u = i / (controlPointsCount - 1)
      newCurvePoints.push(
        new PointBuilder(newCurve.getPointAt(u).toArray() as [number, number]),
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
      t: (progress * (transforms.length - 1)) % 1,
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
        (i) => transforms[(start + i) % transforms.length][key],
      )

      return curveInterpolate(groups as any)
    }

    const { rotate, translate, scale } = {
      rotate: makeBezier('rotate'),
      translate: makeBezier('translate'),
      scale: makeBezier('scale'),
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
            curve[i + 1],
          ),
        )
        path.add(
          new LineCurve(
            curve[i + 1],
            i === curve.length - 3
              ? curve[i + 2]
              : curve[i + 1].clone().lerp(curve[i + 2], 0.5),
          ),
        )
      } else {
        path.add(
          new QuadraticBezierCurve(
            i === 0 ? curve[i] : curve[i].clone().lerp(curve[i + 1], 0.5),
            curve[i + 1],
            i === curve.length - 3
              ? curve[i + 2]
              : curve[i + 1].clone().lerp(curve[i + 2], 0.5),
          ),
        )
      }
    }
    return path
  }

  getBounds(points: PointBuilder[]) {
    const flatX = points.map((x) => x.x)
    const flatY = points.map((y) => y.y)
    const minCoord = new Vector2(min(flatX)!, min(flatY)!)
    const maxCoord = new Vector2(max(flatX)!, max(flatY)!)
    return {
      min: minCoord,
      max: maxCoord,
      size: new Vector2().subVectors(maxCoord, minCoord),
      center: new Vector2().lerpVectors(minCoord, maxCoord, 0.5),
    }
  }

  randomize({
    translate,
    rotate,
    scale,
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
      rotate: rotatePoint,
    })
    this.curves.flat().forEach((p) => {
      this.applyTransform(p, transform)
    })

    return this
  }

  getRandomAlong(...curve: Coordinate[]) {
    const curvePoints = curve.map((x) => this.toPoint(x))
    const curvePath = this.makeCurvePath(curvePoints)
    if (curve.length === 2) {
      return this.toPoint(curve[0]).lerp(this.toPoint(curve[1]), Math.random())
    }
    return new PointBuilder([0, 0]).copy(curvePath.getPointAt(Math.random()))
  }

  getRandomWithin(low: number, high: number): number
  getRandomWithin(
    low: [number, number],
    high: [number, number],
  ): [number, number]
  getRandomWithin(
    low: [number, number],
    high: [number, number],
    count: number,
  ): [number, number][]
  getRandomWithin(low: number, high: number, count: number): number[]
  getRandomWithin(
    low: number | [number, number],
    high: number | [number, number],
    count = 1,
  ): number | [number, number] | (number | [number, number])[] {
    const random = () => {
      if (typeof low === 'number' && typeof high === 'number') {
        return low + Math.random() * (high - low)
      } else {
        return [
          low[0] + Math.random() * (high[0] - low[0]),
          low[1] + Math.random() * (high[1] - low[1]),
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
    variation: [number, number],
  ): [number, number]
  getRandomAround(
    origin: [number, number],
    variation: [number, number],
    count: number,
  ): [number, number][]
  getRandomAround(origin: number, variation: number, count: number): number[]
  getRandomAround(
    origin: number | [number, number],
    variation: number | [number, number],
    count = 1,
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
              .multiply(new Vector2(...(variation as [number, number]))),
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
  .map((c) =>
    c
      .map(
        (p) =>
          `${p
            .toArray()
            .map((p) => p.toFixed(2))
            .join(',')}`,
      )
      .join(' '),
  )
  .join('\n')}`,
    )
    return this
  }

  within(from: Coordinate | Vector2, to: Coordinate | Vector2, curves: number) {
    const fromV = this.toPoint(from)
    const size = new Vector2().copy(this.toPoint(to)).sub(fromV)

    this.lastCurves((g) => {
      const curves = g.flat()
      const bounds = this.getBounds(curves)
      curves.forEach((p) => {
        p.sub(bounds.min).divide(bounds.size).multiply(size).add(fromV)
      })
    }, curves)

    return this
  }

  withinX(from: number, to: number, curves: number) {
    const size = to - from

    this.lastCurves((g) => {
      const curves = g.flat()
      const bounds = this.getBounds(curves)
      curves.forEach((p) => {
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
    curves: number,
  ) {
    let newCurves: PointBuilder[][] = this.curves.slice(
      this.curves.length - curves,
    )
    callback(newCurves)
  }

  /**
   * Slide the curve along itself to offset its start point.
   */
  slide(amount: number) {
    return this.lastCurve((curve) => {
      const path = this.makeCurvePath(curve)
      // const totalLength = path.getLength()
      const offset = curve[0].clone().sub(path.getPointAt(amount))
      curve.forEach((point) => point.add(offset))
    })
  }

  newCurvesBlank(curveCount: number, pointCount: number) {
    this.curves.push(
      ...range(curveCount).map(() =>
        range(pointCount).map(() => new PointBuilder()),
      ),
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
          [0, 0],
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
          [0, 0],
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
    return this.lastCurve((c) => c.push(...this.toPoints(...points)))
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
    }>,
  ) {
    const textCurves = this.curves.slice(
      curves === 'all'
        ? 0
        : curves === 'new'
          ? this.lastIndex
          : curves < 0
            ? this.curves.length + curves
            : curves,
    )
    const flatCurves = textCurves.flat()
    const bounds = this.getBounds(textCurves.flat())

    if (settings.varyPosition) {
      const varyPosition: [number, number] =
        settings.varyPosition instanceof Array
          ? settings.varyPosition
          : [settings.varyPosition, settings.varyPosition]
      flatCurves.forEach((point) => {
        this.applyTransform(
          point,
          this.toTransform({
            translate: this.getRandomAround([0, 0], varyPosition),
          }),
        )
      })
    }

    if (settings.width) {
      this.within(
        bounds.min,
        bounds.min
          .clone()
          .add(bounds.size.divideScalar(bounds.size.x / settings.width)),
        textCurves.length,
      )
      bounds.max = bounds.min.clone().add(bounds.size)
      bounds.center = bounds.min
        .clone()
        .add(bounds.size.clone().divideScalar(2))
    }

    if (settings.center !== undefined) {
      const lineBounds = this.getBounds(flatCurves)
      console.log(settings.center - lineBounds.center.x)

      flatCurves.forEach((point) =>
        point.add({ x: settings.center! - lineBounds.center.x, y: 0 }),
      )
    }

    if (settings.left !== undefined) {
      textCurves.flat().forEach((point) =>
        point.add({
          x: settings.left! - bounds.min.x,
          y: 0,
        }),
      )
    }

    if (settings.top !== undefined) {
      textCurves
        .flat()
        .forEach((point) =>
          point.add({ x: 0, y: settings.top! - bounds.max.y }),
        )
    }

    if (settings.middle !== undefined) {
      textCurves
        .flat()
        .forEach((point) =>
          point.add({ x: 0, y: settings.middle! - bounds.center.y }),
        )
    }
    return this
  }

  newText(
    str: string,
    transform?: CoordinateData,
    settings?: Parameters<(typeof this)['setCurves']>[1],
    eachLetter?: (i: number) => void,
  ) {
    if (transform) {
      this.transform({ ...transform, push: true })
    }
    this.lastIndex = this.curves.length

    const lines: number[] = [this.curves.length]
    let i = 0
    for (let letter of str) {
      if (eachLetter) eachLetter(i)
      if (this.letters[letter]) {
        this.transform({ strength: 0, translate: [0.2, 0], push: true })
        this.letters[letter]()
      } else if (letter === '\n') {
        lines.push(this.curves.length)
        this.transform({
          reset: 'pop',
          translate: [0, -1.5],
          push: true,
        })
      }
      i++
    }

    if (settings) {
      this.setCurves('new', settings)
    }

    return this
  }

  protected letters: Record<string, () => BrushBuilder<T, K>> = {
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
          [0, 0],
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
        [1, 1 - 0.75],
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
          [0, 0],
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
        [0.5, 0.5],
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
          [0, 0],
        )
        .transform({ reset: 'pop' })
        .transform({ translate: [0.2, 0], reset: 'pop' }),
    j: () =>
      this.transform({ translate: [-0.25, 0], push: true })
        .newCurve(
          [0, 0, { translate: [1 - 0.4, 1], scale: [0.7, 1], rotate: 0.05 }],
          [0, -1],
          [-1, -1],
          [-1, -0.5],
        )
        .transform({ rotate: -0.05 })
        .newCurve(
          [
            0,
            0,
            {
              translate: [0, 0.2],
              scale: [0.1 / 2, 0.1],
            },
          ],
          [-1, 0],
          [-1, 1],
          [1, 1],
          [1, 0],
          [0, 0],
        )
        .within([0, -0.5, { reset: 'pop' }], [0.5, 0.5], 2)
        .transform({ translate: [0.25, 0], reset: 'pop' }),
    k: () =>
      this.newCurve([0, 1], [0, 0])
        .newCurve(
          [0, 0, { translate: this.getIntersect(0.6), push: true }],
          [0.3, 0, { rotate: 0.15 }],
        )
        .newCurve([0, 0, { reset: 'pop' }], [0.3, 0, { reset: 'pop' }])
        .within([0, 0], [0.5, 1], 3)
        .transform({ translate: [0.5, 0] }),
    l: () =>
      this.newCurve([0, 1], [0, 0.2], [0, 0], [0.1, 0]).transform({
        translate: [0.2, 0],
        reset: 'pop',
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
        [1, 0],
      ).transform({
        translate: [0.5, 0],
        reset: 'pop',
      }),
    o: () =>
      this.newCurve(
        [0, 0, { translate: [0.25, 0], scale: 0.5 }],
        [-0.5, 0],
        [-0.5, 1],
        [0.5, 1],
        [0.5, 0],
        [0, 0],
      ).transform({ reset: 'pop', translate: [0.5, 0] }),
    p: () =>
      this.newCurve([0, 0, { translate: [0, -0.5] }], [0, 1])
        .newCurve(
          [0, 1, { reset: 'last', scale: 0.5 }],
          [1, 1.3],
          [1, -0.3],
          [0, 0],
        )
        .within([0, -0.5, { reset: 'pop' }], [0.5, 0.5], 2)
        .transform({ translate: [0.5, 0] }),
    q: () =>
      this.newCurve(
        [0, 1, { translate: [0, -0.5], push: true }],
        [0, 0, { strength: 1 }],
        [0.2, 0, { rotate: 0.15 }],
      )
        .newCurve(
          [0, 1, { reset: 'pop', scale: [0.5, 0.5], translate: [0, 0.5] }],
          [-1, 1.3],
          [-1, -0.3],
          [0, 0],
        )
        .within([0, -0.5, { reset: 'pop' }], [0.5, 0.5], 2)
        .transform({ translate: [0.5, 0] }),
    r: () =>
      this.newCurve([0, 0], [0, 0.5])
        .newCurve(
          [0, 0, { translate: this.getIntersect(0.9) }],
          [0.25, 0.1],
          [0.5, 0],
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
        [0, 0],
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
        [1, 0],
      ).transform({ translate: [0.5, 0], reset: 'pop' }),
    v: () =>
      this.newCurve(
        [0, 0, { translate: [0, 0.5], scale: [0.5, 0.5] }],
        [0.5, -1, { strength: 1 }],
        [1, 0],
      ).transform({ translate: [0.5, 0], reset: 'pop' }),
    w: () =>
      this.newCurve(
        [0, 0.5, { scale: [0.7, 1], strength: 1 }],
        [0.25, 0, { strength: 1 }],
        [0.5, 0.5, { strength: 1 }],
        [0.75, 0, { strength: 1 }],
        [1, 0.5, { strength: 1 }],
      ).transform({ translate: [0.7, 0], reset: 'pop' }),
    x: () =>
      this.newCurve([1, 1, { translate: [0.25, 0.25], scale: 0.25 }], [-1, -1])
        .newCurve([-1, 1], [1, -1])
        .transform({ translate: [0.5, 0], reset: 'pop' }),
    y: () =>
      this.newCurve(
        [0, -1, { scale: [0.5, 0.5], translate: [-0.05, 0] }],
        [1, 1],
      )
        .newCurve([0.5, 0], [0, 1])
        .transform({ translate: [0.55, 0], reset: 'pop' }),
    z: () =>
      this.newCurve(
        [0, 1, { scale: 0.5, strength: 1 }],
        [1, 1, { strength: 1 }],
        [0, 0, { strength: 1 }],
        [1, 0],
      ).transform({ translate: [0.5, 0], reset: 'pop' }),
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
      this.settings.maxPoints = max(this.curves.flatMap((x) => x.length))!
    }
    if (this.settings.maxLength === 0) {
      this.settings.maxLength = max(this.curves.map((x) => this.getLength(x)))!
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
    params: K,
    { scene, renderer }: { scene: Scene; renderer: WebGPURenderer },
  ) {
    super()
    this.scene = scene
    this.renderer = renderer

    const defaultBrushSettings: { [T in BrushTypes]: BrushData<T> } = {
      line: { type: 'line' },
      dash: {
        type: 'dash',
        dashSize: 10,
      },
      particles: {
        type: 'particles',
        speedDamping: 1e-3,
        initialSpread: true,
        speedMax: 1,
        speedMin: 0,
        particleSize: 1,
        particleVelocity: (input) => input,
        particlePosition: (input) => input,
        attractorPull: 0,
        attractorPush: 1,
        particleCount: 1e4,
      },
      stripe: { type: 'stripe' },
      dot: { type: 'dot' },
      blob: { type: 'blob', centerMode: 'center' },
    }
    const defaultSettings: ProcessData<T, K> = {
      maxLength: 0,
      maxCurves: 0,
      maxPoints: 0,
      align: 0.5,
      renderInit: false,
      renderClear: true,
      resample: true,
      renderStart: 0,
      squareAspect: false,
      spacing: 3,
      spacingType: 'pixel',
      adjustEnds: true,
      renderTargets: mrt({
        output,
      }),
      pointProgress: (input) => input,
      pointPosition: (input) => input,
      pointColor: (input) => input,
      curvePosition: (input) => input,
      curveColor: (input) => input,
      pointRotate: (input) => input,
      pointThickness: (input) => input,
      onUpdate: () => {},
      onInit: () => {},
    }
    this.settings = {
      ...defaultSettings,
      ...defaultBrushSettings[type],
      ...settings,
    }
    this.params = params

    this.reInitialize(0)
  }
}
