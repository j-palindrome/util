"use client";
import Asemic from "@/libs/asemic/src/Asemic";
import { randomString } from "@/util/src/strings/strings";
import { range, sample } from "lodash";
import { mx_noise_float } from "three/src/nodes/TSL.js";
import { time, vec2, vec3, vec4 } from "three/tsl";

export default function Page() {
  const sampleString = "abcdefghijklmnopqrstuvwxyz   ".split("");
  const strings = range(42).map(() =>
    range(42).map(() => sample(sampleString)),
  );
  return (
    <Asemic
      dimensions={[1080, 1920]}
      builder={(b) =>
        // b.repeat(
        //   (p, i) =>
        //     b.newGroup(g => {
        //       g.transform({
        //         translate: [0, 0.5],
        //         scale: 1 / 6
        //       })
        //         .text('stahp')
        //         // .newCurve([0, 0, { reset: true }], [0.5, 0], [1, 0.5], [0, 0])
        //         .set({
        //           maxLength: 2 / 6,
        //           spacing: 30,
        //           gap: 10
        //           // recalculate: 100,
        //         })
        //     }),
        //   1
        // )
        b.repeat(
          (p, i) =>
            b.group((g) => {
              for (let j = 0; j < 3; j++) {
                strings[i][Math.floor(Math.random() * strings[i].length)] =
                  sample(sampleString);
              }
              g.transform({
                translate: [0, (g.h * p * 41) / 42 + g.h / 42 / 2],
                scale: 1 / 32,
              })
                .text(strings[i].join(""))
                .set({
                  spacing: 3,
                  recalculate: true,
                  maxCurves: 42 * 1.75,
                });
            }),
          42,
        )
      }
    />
  );
}
