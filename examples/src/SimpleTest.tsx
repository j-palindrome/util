import { now } from 'three/examples/jsm/libs/tween.module.js'
import Asemic from '../../util/src/asemic/Asemic'
import Brush from '../../util/src/asemic/Brush'

export default function SimpleTest() {
  return (
    <Asemic>
      <Brush
        key={now()}
        render={
          //           b =>
          //             b.text(
          //               `based on "relevance, which
          //           represents some combination of the web page's
          // presence in links
          //           from other sites
          //   and its popularity with
          // users searching similar terms.`,
          //               { translate: [0, 0.5] }
          //             )
          b =>
            b
              .setting({
                thickness: 10,
                color: [1, 1, 1],
                alpha: 1,
                spacing: 100,
                translate: [0, 0.5]
              })
              .text('trying')
        }
      />
    </Asemic>
  )
}
