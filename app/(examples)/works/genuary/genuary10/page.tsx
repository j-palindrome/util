"use client";
import Asemic, { AsemicCanvas } from "@/libs/asemic/src/Asemic";
import { scale } from "@/util/src/math";
import { now } from "lodash";
import {
  time,
  uv,
  vec2,
  vec3,
  vec4,
  mx_noise_float,
  PI2,
  select,
  length,
  ivec2,
} from "three/tsl";
export default function Page() {
  console.log("obs test");
  return (
    <AsemicCanvas dimensions={[1080, 1920]}>
      <Asemic
        builder={(b) => {
          const TAU = Math.PI * 2;
          const Z = TAU - TAU;
          const O = TAU / TAU;
          const HALF = TAU / (TAU + TAU);
          const TWO = (TAU + TAU) / TAU;
          b.newGroup((g) => {
            g.repeat(Math.floor(TAU), ({ i: j, p: p2 }) => {
              g.newCurve();
              g.transform({
                pointFrag: (input) =>
                  select(
                    input.x.equal(0),
                    input,
                    vec4(
                      1,
                      1,
                      1,
                      0.01,
                      // select(uv().sub(0.5).length().greaterThan(0.5), 0, 0.05)
                    ),
                  ),
                recalculate: true,
                reset: true,
                translate: [HALF, HALF * g.h],
                scale: HALF,
                // gapType: 'count',
                push: true,
                spacing: 100,
                gap: 10,
              });
              // g.newPoints([0, 0], [0.01, 0])

              g.repeat(TAU * (TWO + TWO), ({ p, i }) => {
                g.newPoints([
                  O,
                  Z,
                  {
                    rotate:
                      p * (TWO + TWO + TAU) +
                      (now() / 1000 + p2 * 2) * 4 * (1 - p) +
                      p2,
                    scale: scale(p, Z, O, HALF, TWO + TWO),
                    thickness: g.hash(i + p2 * TAU) * 100,
                    reset: "last",
                  },
                ]);
              });
            });
          });
        }}
      />
    </AsemicCanvas>
  );
}
