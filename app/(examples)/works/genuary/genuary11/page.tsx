"use client";
import { Asemic, AsemicCanvas } from "@/libs/asemic/src/Asemic";
import { scale } from "@/libs/util/math";
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

export default function Genuary11() {
  return (
    <AsemicCanvas dimensions={[1080, 1920]}>
      <Asemic
        builder={(b) => {
          b.transform({
            type: "line",
            thickness: 100,
            gapType: "count",
          }).newGroup((g) =>
            g.text("harder\nthan\nit\nlooks", {
              scale: 0.1,
              translate: [0.3, 0.6 * g.h],
            }),
          );
        }}
      />
    </AsemicCanvas>
  );
}
