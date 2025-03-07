import { max } from 'lodash'
import { mrt, output } from 'three/tsl'
import GroupBuilder from './GroupBuilder'

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

export default class BrushBuilder<T extends BrushTypes> {
  settings: ProcessData & BrushData<T>

  render(builder: GroupBuilder, seconds: number) {
    if (this.settings.renderClear) builder.clear()
    builder.reInitialize(seconds)
    if (this.settings.maxPoints === 0) {
      this.settings.maxPoints = max(builder.curves.flatMap((x) => x.length))!
    }
    if (this.settings.maxLength === 0) {
      this.settings.maxLength = max(
        builder.curves.map((x) => builder.getLength(x)),
      )!
    }
    if (this.settings.maxCurves === 0) {
      this.settings.maxCurves = builder.curves.length
    }
  }

  constructor(type: T, settings: Partial<ProcessData> & Partial<BrushData<T>>) {
    const defaultSettings: ProcessData = {
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
  }
}
