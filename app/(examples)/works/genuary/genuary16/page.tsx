'use client'
import Asemic, { AsemicCanvas } from '@/util/src/asemic/Asemic'

export default function Genuary16() {
  return (
    <AsemicCanvas dimensions={[1080, 1920]}>
      <Asemic
        builder={b =>
          b.newGroup('dash', g => {
            g.text(
              `testing
without
worrying
nothing`,
              { translate: [0, 0.8] }
            )
          })
        }
      />
    </AsemicCanvas>
  )
}
