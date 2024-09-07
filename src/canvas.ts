import { Pt } from 'pts'
import { createNoise2D, createNoise3D } from 'simplex-noise'
const noise = createNoise3D()
const noise2D = createNoise2D()

export function noiseBetter([x, y, z]: number[]) {
  if (z !== undefined) {
    return (noise(x, y, z) + 1) / 2
  } else if (y !== undefined) {
    return (noise2D(x, y) + 1) / 2
  } else {
    return (noise2D(x, 0) + 1) / 2
  }
}

export function noiseBetween(
  points: [number, number][],
  { seed = 1, speed = 1, time }: { seed?: number; speed?: number; time: number }
) {
  const t = time * speed
  let avgVector = new Pt()
  for (let i = 1; i < points.length; i++) {
    const vector = new Pt(points[i][0], points[i][1]).subtract(
      points[i - 1][0],
      points[i - 1][1]
    )
    const noiseBetween = noise(i, seed, t)
    // setMagnitude
    vector.multiply(noiseBetween)
    vector.add(points[i][0], points[i][1])
    avgVector.add(vector)
  }
  if (points.length === 0) return avgVector
  return [avgVector.x, avgVector.y]
}

export function drawCurveBetween(
  ctx: CanvasRenderingContext2D,
  points: [number, number][],
  {
    curveScaleX = 2,
    curveScaleY = 1,
    seed = 1,
    speed = 1
  }: {
    curveScaleX?: number
    curveScaleY?: number
    seed?: number
    speed?: number
  }
) {
  ctx
  this.curveVertex(points[0][0], points[0][1])
  this.curveVertex(points[0][0], points[0][1])

  for (let i = 1; i < points.length; i++) {
    const start = points[i - 1]
    const end = points[i]
    const linearVector = this.createVector(end[0] - start[0], end[1] - start[1])
    const nodeNumber = linearVector.mag() / curveScaleX
    const curveAdd = linearVector.copy().div(nodeNumber)
    let currentCurve = this.createVector(start[0], start[1])
    const time = (this.millis() / 1000) * speed
    for (let i = 0; i < nodeNumber; i++) {
      currentCurve.add(curveAdd)
      const noiseValue = noise(i, seed, time)
      const newCurve = currentCurve.copy().add(
        this.createVector(noiseValue, 0)
          .mult(curveScaleY)
          .setHeading(
            curveAdd.heading() + 0.25 * this.TWO_PI * (noiseValue > 0 ? 1 : -1)
          )
      )

      this.curveVertex(newCurve.x, newCurve.y)
    }
  }

  this.endShape()
}
