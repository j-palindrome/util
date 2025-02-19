"use client";
import Asemic, { AsemicCanvas } from "@/libs/asemic/src/Asemic";
import { time, uv, vec2, vec3, vec4, mx_noise_float } from "three/tsl";

export default function Page() {
  return (
    <AsemicCanvas dimensions={[1080, 1920]}>
      <Asemic
        builder={(b) => {
          // b.newGroup(g => g.newCurve([0, 0], [1, 1]))
          b.transform({
            recalculate: 700,
            pointFrag: (input, info) => {
              const thisUv = vec3(
                uv().y.mul(100),
                info.pointUV.x.mul(100),
                info.pointUV.y.mul(20),
              );
              return vec4(1, 1, 1, mx_noise_float(thisUv));
            },
          }).repeat(25, ({ p }) => {
            b.newGroup((g) => {
              g.repeat(2, () => {
                const random = g.getRandomWithin(0.02, 0.1);
                g.transform({
                  start: p * g.settings.recalculate,
                  reset: true,
                  translate: g.getRandomWithin([0, 0], [1, g.h]),
                  rotate: g.getRandomWithin(0, 1),
                  scale: random,
                  // thickness: g.getRandomWithin(300, 500) * random
                  thickness: random * 500,
                  alpha: g.getRandomWithin(0.2, 0.7),
                });
                g.repeat(12, () =>
                  g.newCurve(
                    [
                      0,
                      0,
                      {
                        translate: [1.5, 0],
                        rotate: 0.015,
                      },
                    ],
                    [0, 1],
                  ),
                );
              });
            });
          });
        }}
      />
    </AsemicCanvas>
  );
}
