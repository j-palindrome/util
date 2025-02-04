'use client'
import Asemic, { AsemicCanvas } from '@/util/src/asemic/Asemic'
import { sampleFix } from '@/util/src/tsl/utility'
import {
  Break,
  float,
  floor,
  Fn,
  If,
  Loop,
  mrt,
  mx_noise_float,
  output,
  screenCoordinate,
  screenSize,
  screenUV,
  sin,
  step,
  texture,
  time,
  uv,
  vec2,
  vec3,
  vec4
} from 'three/tsl'
import { afterImage } from '@/util/src/tsl/afterImage'
import SceneBuilder from '@/util/src/asemic/Builder'
import { range } from 'lodash'

export default function Genuary16() {
  return (
    <AsemicCanvas dimensions={[1080, 1920]}>
      <Asemic
        builder={(b: SceneBuilder) =>
          b
            .newGroup('line', g => {
              g.text(
                `testing
the concept
of something
laid within
one beat
myopic
myriad inset
of one faith
circumstantial
ferreted
void`,
                {
                  translate: [0.1, g.h - 0.1],
                  scale: 0.1
                }
              )
            })
            .newGroup('line', g => {
              g.text(
                `nothing
incongruent
shale-laden
suffocate
frequenting
almost bright
curtain wants
to see mesh
feedback ring
sumptuous
excess`,
                {
                  translate: [0.1, g.h - 0.1 * 1.5],
                  scale: 0.1
                }
              )
            })
            .repeat(2, ({ i }) =>
              b.newGroup(
                'line',
                g => {
                  g.newCurves(
                    5,
                    {
                      reset: true,
                      thickness: 100,
                      alpha: 1,
                      translate: [0, 0.5 * g.h]
                    },
                    [0, 0],
                    [1, 0]
                  )
                },
                {
                  update: true,
                  renderTargets: mrt({
                    output: float(0),
                    textureRight: !i ? output : float(0),
                    textureLeft: i ? output : float(0)
                  }),
                  pointFrag: (input, { pointUV }) => {
                    const progress = time.mul(4).add(pointUV.y)
                    return step(
                      !i ? pointUV.x.oneMinus() : pointUV.x,
                      progress.fract()
                    ).mul(input.a)
                  },
                  curveVert: (input, { pointUV, height: aspectRatio }) => {
                    const progress = time.mul(4).add(pointUV.y)
                    input.xy.addAssign(
                      vec2(
                        0,
                        mx_noise_float(
                          vec2(
                            pointUV.y
                              .add(i ? 4.3425 : 3.4953)
                              .mul(i ? 3.3942 : 4.3249),
                            floor(progress)
                          )
                        ).mul(aspectRatio)
                      )
                    )
                    return input
                  }
                }
              )
            )
        }
        settings={{
          postProcessing: (input, { scenePass, lastOutput }) => {
            scenePass.setMRT(
              mrt({
                output,
                textureRight: float(0),
                textureLeft: float(0)
              })
            )

            return Fn(() => {
              const output = scenePass
                .getTextureNode('output')
                .toVar('outputAssign')
              const count = 400
              const space = 1

              const feedback1 = afterImage(
                scenePass.getTextureNode('textureLeft'),
                0.95
              ) as any
              const feedback2 = afterImage(
                scenePass.getTextureNode('textureRight'),
                0.95
              ) as any

              const loopCount1 = feedback1.x.mul(count)
              const loopCount2 = feedback2.x.mul(count)

              Loop(count, ({ i }) => {
                If(float(i).greaterThan(loopCount1), () => {
                  Break()
                })
                output.addAssign(
                  sampleFix(
                    scenePass.getTextureNode('output'),
                    screenUV.add(
                      vec2(float(i).mul(space).mul(1).div(screenSize.x), 0)
                    )
                  ).div(float(i).add(1))
                )
              })

              Loop(count, ({ i }) => {
                If(float(i).greaterThan(loopCount2), () => {
                  Break()
                })
                input.addAssign(
                  sampleFix(
                    scenePass.getTextureNode('output'),
                    screenUV.add(
                      vec2(float(i).mul(space).mul(-1).div(screenSize.x), 0)
                    )
                  ).div(float(i).add(1))
                )
              })

              return output
            })()
          }
        }}
      />
    </AsemicCanvas>
  )
}
