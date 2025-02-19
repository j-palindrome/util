"use client";
import Asemic, { AsemicCanvas } from "@/libs/asemic/src/Asemic";
import { scale } from "@/libs/util/math";
import { waveform } from "@/libs/util/math/functions";
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
  vertexIndex,
} from "three/tsl";

export default function Genuary13() {
  return (
    <AsemicCanvas dimensions={[1080, 1920]}>
      <Asemic
        builder={(b) => {
          b.newGroup("line", (g) => {
            g.transform({ rotate: 0.25, push: true });
            g.repeat(100, () =>
              g
                .transform({
                  recalculate: true,
                  reset: "last",
                  translate: g.getRandomWithin([0, -1], [-g.h * 0.75, 0]),
                  scale: [g.h, 1],
                })
                .newCurve(
                  [0, 0, { thickness: 80, alpha: 0.01 }],
                  [1, 0, { thickness: 0 }],
                ),
            );
          });
        }}
      />
    </AsemicCanvas>
  );
}
