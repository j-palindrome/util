"use client";

import Asemic from "@/libs/asemic/src/Asemic";
import PointBrush from "@/libs/asemic/src/DashBrush";
import { afterImage } from "@/util/src/tsl/afterImage";
import { gaussianBlur } from "@/util/src/tsl/effects";
import { screenUV, select, time, uv, vec2, vec4 } from "three/tsl";

// Inspired by brutalism
export default function Genuary23() {
  return (
    <Asemic
      postProcessing={(input, { scenePass }) => {
        return afterImage(gaussianBlur(input, screenUV, vec2(15, 15)), 0.9);

        // return input
        // return input
      }}
    >
      {(scene) => (
        <PointBrush
          onInit={(b) =>
            b.repeat(200, () =>
              b.newCurve(
                [0.5, 0, { thickness: 30, alpha: 0.05 }],
                [Math.random(), 0.15 * scene.h],
                [Math.random(), 0.5 * scene.h],
                [Math.random(), 0.85 * scene.h],
                [0.5, 1 * scene.h],
              ),
            )
          }
          maxLength={3}
          dashSize={150}
          pointColor={(color) =>
            vec4(
              1,
              1,
              1,
              select(uv().sub(0.5).length().greaterThan(0.5), 0, color.a),
            )
          }
          pointProgress={(progress, info) =>
            info.progress
              .floor()
              .div(info.builder.settings.maxCurves)
              .add(progress)
              .add(time.mul(0.5))
              .fract()
          }
          spacing={1}
          spacingType="count"
        />
      )}
    </Asemic>
  );
}
