"use client";
import Asemic from "@/libs/asemic/src/Asemic";
import { PointBuilder } from "@/libs/asemic/src/PointBuilder";
import { easeInOutSine } from "@/libs/util/tsl/easing";
import { random } from "lodash";
import { Vector2 } from "three";
import { mix, time } from "three/tsl";

export default function Genuary6() {
  const poem = ["sometrees", "amazing"];
  return (
    <Asemic
      dimensions={[1080, 1920]}
      builder={(b) => {
        b.transform({
          recalculate: 2000,
          update: true,
          strength: 1,
          curveVert: (input, info) => {
            return mix(
              info.lastPosition,
              input,
              easeInOutSine(
                time
                  .sub(info.settings.start / 1000)
                  .mod(2)
                  .div(2),
              ),
            );
          },
          curveFrag: (input, info) => {
            return mix(
              info.lastColor,
              input,
              time
                .sub(info.settings.start / 1000)
                .mod(2)
                .div(2),
            );
          },
        }).repeat(2, ({ i }) => {
          b.repeat(poem[i].length, ({ i: j }) => {
            b.newGroup((g) => {
              g.transform({ start: j * 250 });
              g.repeat(1, () => {
                // const point = g.getRandomWithin([0.5, 0, { reset: true }], [0.2, 0])
                // const resetTransform: PreTransformData =
                //   i === 0 ? { reset: true, translate: [0, 0] } : { reset: true }

                // const point = g.toPoint([0.5, 0, resetTransform])

                g.newCurve([
                  0,
                  0,
                  {
                    strength: 0,
                    reset: true,
                    translate: [
                      g.getRandomWithin(0.5, 0.05),
                      i === 0 ? g.h : 0,
                    ],
                    scale: (i === 0 ? -1 : 1) / 6,
                  },
                ])
                  .repeat(8, () => {
                    g.newPoints([
                      0,
                      1,
                      {
                        thickness: Math.random() * 10,
                        alpha: Math.random() * 0.7,
                      },
                    ])
                      .transform({
                        rotate:
                          g.currentTransform.translate.x < 0.2
                            ? i === 0
                              ? random(0, 0.2)
                              : random(-0.2, 0)
                            : g.currentTransform.translate.x > 0.8
                              ? i === 0
                                ? random(-0.2, 0)
                                : random(0, 0.2)
                              : random(-0.08, 0.08),
                        scale: 0.9,
                      })
                      .transform({ translate: [0, 1] });
                  })
                  .text(poem[i][j], {
                    strength: 0,
                    alpha: 1,
                    thickness: 1,
                    translate: i === 0 ? [0, 0.7] : [0, 0],
                    scale: new PointBuilder([0.07, 0.07]).divide(
                      g.currentTransform.scale,
                    ),
                  });
              });
            });
          });
        });
      }}
    />
  );
}
