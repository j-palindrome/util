'use client'
import { useAsemic } from '@/asemic/src/Asemic'
import BlobBrush from '@/asemic/src/BlobBrush'
// line that may or may not intersect
import { toTuple } from '@/asemic/src/typeGuards'
import { Vector2 } from 'three'
import LineBrush from '@/asemic/src/LineBrush'
import PointBrush from '@/asemic/src/DashBrush'
import { init } from './bitonic-sort'

// grid-based graphic design
export default function Genuary30() {
  const { h, mouse } = useAsemic()
  init()
  return <></>
}
