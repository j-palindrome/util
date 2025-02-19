"use client";
import { Asemic, AsemicCanvas } from "@/libs/asemic/src/Asemic";
import { scale } from "@/libs/util/math";
import { now } from "lodash";

import { bloom } from "three/examples/jsm/tsl/display/BloomNode.js";
import { floor, Fn, PI2, range, select, vec4 } from "three/tsl";

export default function Genuary14() {
  return (
    <AsemicCanvas dimensions={[1080, 1920]}>
      <Asemic
        builder={(b) =>
          b.newGroup(
            "dash",
            (g) => {
              g.transform({
                scale: [1, g.h],
                push: true,
                alpha: 1 / 256,
              });
              g.repeat(300, ({ i }) =>
                g.newCurve(
                  [
                    0,
                    g.noise([g.time * 0.5, g.hash(), i]),
                    {
                      thickness: 1920 * 1.1,
                      reset: "last",
                      scale: [1, g.getRange(g.hash(), [0.1, 0.2])],
                      translate: [g.getRange(g.hash(), [0, 0.1]), -0.1],
                    },
                  ],
                  [0.5, g.noise([g.time * 0.5, g.hash(), i])],
                  [1, g.noise([g.time * 0.5, g.hash(), i])],
                ),
              );
            },
            {
              spacing: 500,
              renderInit: true,
              align: 0,
            },
            {
              dashSize: 1,
              pointRotate: (input) =>
                range(0, 1).mul(PI2.mul(0.05)).add(-0.2).add(PI2.div(-4)),
            },
          )
        }
      />
    </AsemicCanvas>
  );
}
