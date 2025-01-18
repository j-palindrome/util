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
                  translate: [0.1, g.h - 0.15],
                  scale: 0.1
                }
              )
            })
            .newGroup(
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
                recalculate: true,
                renderTargets: mrt({
                  output: float(0),
                  texture2: output
                }),
                pointFrag: (input, { pointUV }) => {
                  const progress = time.mul(2).add(pointUV.y)
                  return step(pointUV.x.oneMinus(), progress.fract()).mul(
                    input.a
                  )
                },
                curveVert: (input, { pointUV, aspectRatio }) => {
                  const progress = time.mul(2).add(pointUV.y)
                  input.xy.addAssign(
                    vec2(
                      0,
                      mx_noise_float(
                        vec2(pointUV.y.add(4.3425).mul(3.3942), floor(progress))
                      ).mul(aspectRatio)
                    )
                  )
                  return input
                }
              }
            )
        }
        settings={{
          postProcessing: (input, { scenePass, lastOutput }) => {
            scenePass.setMRT(
              mrt({
                output,
                texture2: float(0)
              })
            )
            // return lastOutput
            return Fn(() => {
              let output = vec4(scenePass.getTextureNode()).toVar('outputNode')

              const feedback = afterImage(
                sampleFix(
                  scenePass.getTextureNode('texture2'),
                  screenUV.add(0.001).fract()
                ),
                0.99
              ) as any
              const count = 300
              const loopCount = feedback.x.mul(count)
              Loop(count, ({ i }) => {
                If(float(i).greaterThan(loopCount), () => {
                  Break()
                })
                output.addAssign(
                  sampleFix(
                    scenePass.getTextureNode('output'),
                    screenUV.add(vec2(float(i).mul(1).div(screenSize.x), 0))
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
