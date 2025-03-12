import { max } from 'lodash'
import { mrt, output } from 'three/tsl'
import GroupBuilder from './GroupBuilder'
import {
  ComputeNode,
  Scene,
  Vector2,
  Vector4,
  WebGPURenderer
} from 'three/webgpu'
import { useFrame, useThree } from '@react-three/fiber'
import { range } from 'lodash'
import { useCallback, useEffect, useRef } from 'react'
import { Fn } from 'three/src/nodes/TSL.js'
import {
  atan,
  float,
  floor,
  If,
  instancedArray,
  instanceIndex,
  int,
  mix,
  screenSize,
  select,
  uniformArray,
  varying,
  vec2,
  vec4
} from 'three/tsl'
import { bezierPosition, bezierRotation } from '../util/bezier'
import invariant from 'tiny-invariant'

export default abstract class BrushBuilder<T extends BrushTypes> {
  protected settings: ProcessData<T> & BrushData<T>
  protected info: {
    controlPointCounts: ReturnType<typeof uniformArray>
    curvePositionArray: ReturnType<typeof instancedArray>
    curveColorArray: ReturnType<typeof instancedArray>
    instancesPerCurve: number
  } & Record<string, any>
  protected renderer: WebGPURenderer
  protected group: GroupBuilder
  protected scene: Scene
  protected abstract getDefaultBrushSettings(): BrushData<T>
  protected abstract onFrame()
  protected abstract onDraw()
  protected abstract onInit()
  protected abstract onDispose()
  protected advanceControlPoints: ComputeNode
  protected loadControlPoints: ComputeNode
  protected nextTime: number
  protected size = new Vector2()

  frame(elapsedTime: number) {
    if (elapsedTime >= this.nextTime) {
      const r = this.settings.renderInit
      this.nextTime =
        typeof r === 'boolean'
          ? r
            ? elapsedTime + 1 / 60
            : Infinity
          : typeof r === 'number'
          ? elapsedTime + r / 1000
          : elapsedTime + r(this.nextTime * 1000) / 1000
      if (this.settings.renderClear) this.group.clear()
      this.group.reInitialize(
        elapsedTime,
        this.renderer.getDrawingBufferSize(this.size)
      )
      for (let i = 0; i < this.settings.maxCurves; i++) {
        this.info.controlPointCounts.array[i] = this.group.curves[i].length
      }
      const loadColorsArray = this.info.loadColors.array as Vector4[]
      const loadPositionsArray = this.info.loadPositions.array as Vector4[]
      for (let i = 0; i < this.settings.maxCurves; i++) {
        const curveIndex = i * this.settings.maxPoints
        for (let j = 0; j < this.settings.maxPoints; j++) {
          const point = this.group.curves[i]?.[j]
          if (point) {
            loadPositionsArray[curveIndex + j].set(
              point.x,
              point.y,
              point.strength,
              point.thickness
            )
            loadColorsArray[curveIndex + j].set(
              point.color[0],
              point.color[1],
              point.color[2],
              point.alpha
            )
          } else {
            loadPositionsArray[curveIndex + j].set(0, 0, 0, 0)
            loadColorsArray[curveIndex + j].set(0, 0, 0, 0)
          }
        }
      }
      this.renderer.compute(this.loadControlPoints)
      this.onDraw()
    }
    this.renderer.compute(this.advanceControlPoints)
    this.onFrame()
  }

  dispose() {
    this.info.curvePositionArray.dispose()
    this.info.curveColorArray.dispose()
    if (this.settings.onClick) {
      this.renderer.domElement.removeEventListener('click', this.onClick)
    }
    if (this.settings.onDrag) {
      this.renderer.domElement.removeEventListener('mouseover', this.onDrag)
    }
    if (this.settings.onOver) {
      this.renderer.domElement.removeEventListener('mouseover', this.onOver)
    }
    this.onDispose()
  }

  protected getBezier(
    progress: ReturnType<typeof float>,
    position: ReturnType<typeof vec2>,
    extra?: {
      rotation?: ReturnType<typeof float>
      thickness?: ReturnType<typeof float>
      color?:
        | ReturnType<typeof varying>
        | ReturnType<ReturnType<typeof float>['toVar']>
      progress?: ReturnType<typeof varying>
    }
  ) {
    const progressVar = progress.toVar()
    If(progressVar.equal(-1), () => {
      extra?.color?.assign(vec4(0, 0, 0, 0))
    }).Else(() => {
      progressVar.assign(
        floor(progress).add(
          this.settings.pointProgress(progress.fract(), {
            builder: this.group,
            progress
          })
        )
      )
      extra?.progress?.assign(progressVar)
      const controlPointsCount = this.info.controlPointCounts.element(
        int(progressVar)
      )
      const subdivisions = select(
        controlPointsCount.equal(2),
        1,
        this.settings.adjustEnds === 'loop'
          ? controlPointsCount
          : controlPointsCount.sub(2)
      ).toVar()

      //4 points: 4-2 = 2 0->1 1->2 (if it goes to the last value then it starts interpolating another curve)
      const t = vec2(
        progressVar.fract().mul(0.999).mul(subdivisions),
        floor(progressVar)
      )
      const curveIndex = floor(progressVar).mul(this.settings.maxPoints)
      const pointIndex = progressVar.fract().mul(0.999).mul(subdivisions)
      const index = curveIndex.add(pointIndex).toVar()

      If(controlPointsCount.equal(2), () => {
        const p0 = this.info.curvePositionArray.element(index)
        const p1 = this.info.curvePositionArray.element(index.add(1))
        const progressPoint = mix(p0, p1, t.x)

        position.assign(progressPoint.xy)
        if (extra) {
          const index = t.y.mul(this.settings.maxPoints).add(t.x)
          // extra.color?.assign(this.info.curveColorArray.element(index))
          extra.color?.assign(this.info.curveColorArray.element(0))
          extra.thickness?.assign(progressPoint.w)
          const rotationCalc = p1.xy.sub(p0.xy).toVar()
          extra.rotation?.assign(atan(rotationCalc.y, rotationCalc.x))
        }
      }).Else(() => {
        const p0 = this.info.curvePositionArray.element(index).toVar()
        const p1 = this.info.curvePositionArray
          .element(curveIndex.add(pointIndex.add(1).mod(controlPointsCount)))
          .toVar()
        const p2 = this.info.curvePositionArray
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
          strength
        })

        position.assign(pos)
        const c0 = this.info.curveColorArray.element(index)
        const c1 = this.info.curveColorArray.element(index.add(1))
        if (extra) {
          extra.color?.assign(mix(c0, c1, t.x.fract()))
          extra.thickness?.assign(
            bezierPosition({
              t: t.x.fract(),
              p0: vec2(0, p0.w),
              p1: vec2(0.5, p1.w),
              p2: vec2(1, p2.w),
              strength
            }).y
          )
          extra.rotation?.assign(
            bezierRotation({
              t: t.x.fract(),
              p0: p0.xy,
              p1: p1.xy,
              p2: p2.xy,
              strength
            })
          )
        }
      })
    })
    position.assign(
      this.settings.pointPosition(position, { builder: this.group, progress })
    )
    if (extra) {
      extra.thickness?.assign(
        this.settings
          .pointThickness(extra.thickness, {
            progress: progressVar,
            builder: this.group
          })
          .div(screenSize.x)
      )
      extra.rotation?.assign(
        this.settings.pointRotate(extra.rotation!, {
          progress: extra.progress!,
          builder: this.group
        })
      )
    }
  }

  screenToWorld(ev: MouseEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    const x = (ev.clientX - rect.left) / rect.width
    const y = (rect.height - (ev.clientY - rect.top)) / rect.width
    return new Vector2(x, y)
  }

  onOver(ev: MouseEvent) {
    if (this.group.getIsWithin(this.screenToWorld(ev)) && !ev.buttons)
      this.settings.onOver(this)
  }

  onDrag(ev: MouseEvent) {
    if (ev.buttons && this.group.getIsWithin(this.screenToWorld(ev)))
      this.settings.onDrag(this)
  }

  onClick(ev: MouseEvent) {
    console.log(this.screenToWorld(ev))
    if (this.group.getIsWithin(this.screenToWorld(ev)))
      this.settings.onClick(this)
  }

  constructor(
    settings: Partial<ProcessData<T>> & Partial<BrushData<T>>,
    {
      renderer,
      group,
      scene
    }: { renderer: WebGPURenderer; group: GroupBuilder; scene: Scene }
  ) {
    this.renderer = renderer
    this.group = group
    this.scene = scene

    this.group.reInitialize(0, this.renderer.getDrawingBufferSize(this.size))

    const defaultSettings: ProcessData<T> = {
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
        output
      }),
      pointProgress: input => input,
      pointPosition: input => input,
      pointColor: input => input,
      curvePosition: input => input,
      curveColor: input => input,
      pointRotate: input => input,
      pointThickness: input => input
    }

    this.settings = {
      ...defaultSettings,
      ...this.getDefaultBrushSettings(),
      ...settings
    }
    if (this.settings.maxPoints === 0) {
      this.settings.maxPoints = max(this.group.curves.flatMap(x => x.length))!
    }
    if (this.settings.maxLength === 0) {
      this.settings.maxLength = max(
        this.group.curves.map(x => this.group.getLength(x))
      )!
    }
    if (this.settings.maxCurves === 0) {
      this.settings.maxCurves = this.group.curves.length
    }
    const size = this.renderer.getDrawingBufferSize(new Vector2())
    this.info = {
      instancesPerCurve: Math.max(
        1,
        Math.floor(
          this.settings.spacingType === 'pixel'
            ? (this.settings.maxLength * size.width) / this.settings.spacing
            : this.settings.spacingType === 'width'
            ? (this.settings.maxLength * size.width) /
              (this.settings.spacing * size.width)
            : this.settings.spacingType === 'count'
            ? this.settings.spacing
            : 0
        )
      ),
      curvePositionArray: instancedArray(
        this.settings.maxPoints * this.settings.maxCurves,
        'vec4'
      ),
      curveColorArray: instancedArray(
        this.settings.maxPoints * this.settings.maxCurves,
        'vec4'
      ),
      loadPositions: uniformArray(
        range(this.settings.maxPoints * this.settings.maxCurves).map(
          x => new Vector4()
        ),
        'vec4'
      ),
      loadColors: uniformArray(
        range(this.settings.maxPoints * this.settings.maxCurves).map(
          x => new Vector4()
        ),
        'vec4'
      ),
      controlPointCounts: uniformArray(
        this.group.curves.map(x => x.length),
        'int'
      )
    }

    this.advanceControlPoints = Fn(() => {
      const pointI = instanceIndex.modInt(this.settings.maxPoints)
      const curveI = instanceIndex.div(this.settings.maxPoints)
      const info = {
        progress: curveI
          .toFloat()
          .add(
            pointI
              .toFloat()
              .div(this.info.controlPointCounts.element(curveI).sub(1))
          ),
        builder: this.group
      }
      const index = curveI.mul(this.settings.maxPoints).add(pointI)
      const thisPosition = this.info.loadPositions.element(index)
      this.info.curvePositionArray.element(index).assign(
        this.settings.curvePosition(thisPosition, {
          ...info,
          lastFrame: this.info.curvePositionArray.element(index)
        })
      )
      const thisColor = this.info.loadColors.element(index)
      this.info.curveColorArray.element(index).assign(
        this.settings.curveColor(thisColor, {
          ...info,
          lastFrame: this.info.curveColorArray.element(index)
        })
      )
    })().compute(this.settings.maxPoints * this.settings.maxCurves)

    this.loadControlPoints = Fn(() => {
      this.info.curvePositionArray
        .element(instanceIndex)
        .assign(this.info.loadPositions.element(instanceIndex))
      this.info.curveColorArray
        .element(instanceIndex)
        .assign(this.info.loadColors.element(instanceIndex))
    })().compute(this.settings.maxCurves * this.settings.maxPoints)

    this.nextTime =
      (typeof this.settings.renderStart === 'function'
        ? this.settings.renderStart()
        : this.settings.renderStart) / 1000

    this.onInit()
    this.frame(0)

    if (this.settings.onClick) {
      this.renderer.domElement.addEventListener(
        'click',
        this.onClick.bind(this)
      )
    }
    if (this.settings.onDrag) {
      this.renderer.domElement.addEventListener(
        'mousemove',
        this.onDrag.bind(this)
      )
    }
    if (this.settings.onOver) {
      this.renderer.domElement.addEventListener(
        'mousemove',
        this.onOver.bind(this)
      )
    }
  }
}
