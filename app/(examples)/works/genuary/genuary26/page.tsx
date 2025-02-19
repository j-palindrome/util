"use client";
// line that may or may not intersect

import Asemic from "@/libs/asemic/src/Asemic";
import PointBrush from "@/libs/asemic/src/DashBrush";
import {
  fract,
  hash,
  If,
  mx_noise_float,
  mx_noise_vec3,
  range,
  select,
  time,
  vec2,
  vec4,
} from "three/tsl";

// Inspired by brutalism
export default function Genuary26() {
  return (
    <Asemic>
      {(s) => (
        <PointBrush
          renderInit
          onInit={(b) => {
            b.clear();
            const curve: Coordinate[] = [
              [0.02, 0.98],
              [0.89, 0.72],
              [0.52, 0.55],
              [0.79, 0.38],
              [0.36, 0.24],
              [0.63, 0.11],
              [0.01, 0.0],
            ];
            b.transform({
              translate: [0, s.h],
              scale: [s.h, 1 / s.h],
              rotate: -0.25,
              push: true,
            });
            b.newCurve(
              { translate: [0.5, 0], scale: [0.5, s.h] },
              ...curve.map(
                (x) =>
                  [
                    x[0],
                    x[1],
                    {
                      thickness: b.noise([b.hash(), b.time * 0.5]) ** 2 * 2000,
                      alpha: 0.01 * b.hash(),
                    },
                  ] as any,
              ),
            );
            b.newCurve(
              {
                reset: "last",
                translate: [0.5, 0],
                scale: [-0.5, s.h],
              },
              ...curve.map(
                (x) =>
                  [
                    x[0],
                    x[1],
                    {
                      thickness: b.noise([b.hash(), b.time * 0.5]) ** 2 * 2000,
                      alpha: 0.01 * b.hash(),
                    },
                  ] as any,
              ),
            );
          }}
          curvePosition={(pos, info) => {
            return select(
              fract(info.progress).equal(0),
              pos,
              vec4(
                pos.xy.add(
                  mx_noise_float(vec2(pos.x.mul(10), time)).xy.mul(0.3),
                ),
                pos.zw,
              ),
            );
          }}
          pointThickness={(t) => t.mul(hash(range(0, 100).add(time.mul(60))))}
          spacing={0.5}
        />
      )}
    </Asemic>
  );
}
