'use client'

import Asemic, { AsemicCanvas } from '@/util/src/asemic/Asemic'
import Particles from '@/util/src/asemic/Particles'

export default function Genuary8() {
  return (
    <AsemicCanvas dimensions={[1080, 1920]}>
      <Particles />
    </AsemicCanvas>
  )
}
