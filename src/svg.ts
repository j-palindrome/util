import { Group, Num, Pt } from 'pts'

export const toSvgPoint = (point: Pt) =>
  `${point.x.toFixed(2)} ${point.y.toFixed(2)}`

export const pointsToBezier = (points: Pt[]) => {
  let curve = `M ${toSvgPoint(points[0])} T ${toSvgPoint(points[1])} `
  for (let i = 2; i < points.length; i++) {
    curve += `${toSvgPoint(points[i])} `
  }
  return curve
}

export const subdivideLine = (start: Pt, end: Pt, subdivisions: number) => {
  const group = new Group()

  for (let i = 0; i <= subdivisions; i++) {
    group.push(
      new Pt(
        Num.lerp(start.x, end.x, i * (1 / subdivisions)),
        Num.lerp(start.y, end.y, i * (1 / subdivisions)),
      ),
    )
  }
  return group
}
