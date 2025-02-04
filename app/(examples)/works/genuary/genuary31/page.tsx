'use client'
import { useAsemic } from '@/util/src/asemic/Asemic'
import BlobBrush from '@/util/src/asemic/BlobBrush'
// line that may or may not intersect
import { toTuple } from '@/util/src/asemic/typeGuards'
import { Vector2 } from 'three'
import LineBrush from '@/util/src/asemic/LineBrush'
import PointBrush from '@/util/src/asemic/DashBrush'
import { init } from './bitonic-sort'

// grid-based graphic design
export default function Genuary30() {
  const { h, mouse } = useAsemic()
  init()
  return <></>
}
