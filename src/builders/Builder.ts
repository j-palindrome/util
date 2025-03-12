import { last } from 'lodash'
import { createNoise2D, createNoise3D, createNoise4D } from 'simplex-noise'
import { Vector2 } from 'three'
import { isTransformData } from '../typeGuards'
import { multiBezierJS } from '../util/bezier'

export const defaultCoordinateSettings: CoordinateSettings = {
  strength: 0,
  alpha: 1,
  color: [1, 1, 1],
  thickness: 1,
}

export default abstract class Builder {
  protected transforms: TransformData[] = []
  currentTransform: TransformData = this.toTransform()
  pointSettings: PreTransformData & CoordinateData = defaultCoordinateSettings
  protected noiseFuncs: ((...args: any[]) => number)[] = []
  protected randomTable: number[] = []
  protected hashIndex: number = 0
  protected noiseIndex: number = 0
  vec2 = new Vector2()

  repeatGrid(
    dimensions: [number, number],
    func: ({
      p,
      i,
      count,
    }: {
      p: Vector2
      i: Vector2
      count: Vector2
      pCenter: Vector2
      pComplete: Vector2
      iNumber: number
    }) => void,
  ) {
    let p = new Vector2()
    let pCenter = new Vector2()
    let pComplete = new Vector2()
    let i = new Vector2()
    let count = new Vector2(...dimensions)
    for (let y = 0; y < dimensions[1]; y++) {
      for (let x = 0; x < dimensions[0]; x++) {
        func({
          p: p.set(x / dimensions[0], y / dimensions[1]),
          pCenter: pCenter.set(
            x / dimensions[0] + 1 / dimensions[0] / 2,
            y / dimensions[1] + 1 / dimensions[1] / 2,
          ),
          i: i.set(x, y),
          pComplete: pComplete.set(
            x / (dimensions[0] - 1),
            y / (dimensions[1] - 1),
          ),
          count,
          iNumber: x + y * x,
        })
      }
    }

    return this
  }

  repeat(
    count: number | { count: number },
    func: ({
      p,
      i,
      count,
      pComplete,
    }: {
      p: number
      i: number
      count: number
      pComplete: number
    }) => void,
  ) {
    const runCount = typeof count === 'number' ? count : count.count
    for (let i = 0; i < runCount; i++) {
      func({
        p: i / runCount,
        pComplete: i / (runCount - 1 || 1),
        i,
        count: runCount,
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
            last(this.transforms) ?? this.toTransform(),
          )
          break
        case true:
          this.reset()
          break
      }
    }

    this.currentTransform = this.combineTransforms(
      this.currentTransform,
      this.toTransform(transform),
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
    invert: boolean = false,
  ) {
    if (invert) {
      transformData.translate.sub(
        nextTransformData.translate
          .divide(transformData.scale)
          .rotateAround({ x: 0, y: 0 }, -transformData.rotate),
      )
      transformData.rotate -= nextTransformData.rotate
      transformData.scale.divide(nextTransformData.scale)
    } else {
      transformData.translate.add(
        nextTransformData.translate
          .multiply(transformData.scale)
          .rotateAround({ x: 0, y: 0 }, transformData.rotate),
      )
      transformData.rotate += nextTransformData.rotate
      transformData.scale.multiply(nextTransformData.scale)
    }

    return transformData
  }

  applyTransform<T extends Vector2>(
    vector: T,
    transformData: TransformData | PreTransformData,
    invert: boolean = false,
  ): T {
    const convertedData = this.toTransform(transformData)
    if (invert) {
      vector
        .sub(convertedData.translate)
        .rotateAround({ x: 0, y: 0 }, -convertedData.rotate)
        .divide(convertedData.scale)
    } else {
      vector
        .multiply(convertedData.scale)
        .rotateAround({ x: 0, y: 0 }, convertedData.rotate)
        .add(convertedData.translate)
    }

    return vector
  }

  protected cloneTransform(transform: TransformData): TransformData {
    return {
      scale: transform.scale.clone(),
      rotate: transform.rotate,
      translate: transform.translate.clone(),
      isTransformData: true,
    }
  }

  protected toTransform(
    transform?: PreTransformData | TransformData,
  ): TransformData {
    if (isTransformData(transform)) return transform
    if (!transform) {
      return {
        scale: new Vector2(1, 1),
        rotate: 0,
        translate: new Vector2(),
        isTransformData: true,
      }
    }
    return {
      scale:
        typeof transform.scale === 'number'
          ? new Vector2(transform.scale, transform.scale)
          : transform.scale instanceof Array
            ? new Vector2(...transform.scale)
            : (transform.scale ?? new Vector2(1, 1)),
      rotate: this.toRad(transform.rotate ?? 0),
      translate:
        transform.translate instanceof Array
          ? new Vector2(...transform.translate)
          : (transform.translate ?? new Vector2()),
      isTransformData: true,
    }
  }

  getAlong<T extends Vector2 | Coordinate | number>(
    t: number,
    ...curve: T[]
  ): T extends number ? number : Vector2 {
    const result = multiBezierJS(
      t,
      ...curve.map((x) =>
        x instanceof Array
          ? new Vector2(x[0], x[1])
          : x instanceof Vector2
            ? x
            : new Vector2(x, 0),
      ),
    )
    if (typeof curve[0] === 'number') {
      // @ts-ignore
      return result.x as number
      // @ts-ignore
    } else return result as Vector2
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
    {
      signed = false,
      advance = true,
    }: { signed?: boolean; advance?: boolean } = {},
  ) {
    if (!advance) {
      this.noiseIndex = Math.max(0, this.noiseIndex - 1)!
    }
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
