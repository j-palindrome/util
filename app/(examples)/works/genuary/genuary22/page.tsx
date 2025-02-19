"use client";

import { useAsemic } from "@/libs/asemic/src/Asemic";
import { noiseWaveRandom, simplex2D } from "@/libs/util/tsl/noise";
import { el } from "@elemaudio/core";
import { mix, PI, PI2, range, sin, time, uv, vec4 } from "three/tsl";
import LineBrush from "@/libs/asemic/src/LineBrush";
import { useThree } from "@react-three/fiber";

export default function Genuary18() {
  const { h } = useAsemic({
    controls: {
      constants: {},
      refs: {},
      uniforms: {},
    },
    postProcessing: (input, { readback }) => {
      return input;
    },
  });
  const size = useThree((state) => state.size);

  return (
    <LineBrush
      onInit={(g) => {
        g.newCurve([0, 0.5 * h, { thickness: size.height }], [1, 0.5 * h]);
      }}
      pointColor={(input, { uv }) => {
        const f1 = noiseWaveRandom(0.23423, 0.15).pow(1.5);
        const f2 = noiseWaveRandom(0.2534, 0.15).pow(1.5);
        const f3 = noiseWaveRandom(0.924302, 0.15).pow(1.5);
        const f4 = noiseWaveRandom(0.10493872, 0.15).pow(1.5);
        return vec4(
          1,
          1,
          1,
          mix(mix(f1, f2, uv.x), mix(f3, f4, uv.x), uv.y).mul((1 / 256) * 20),
        );
      }}
      pointRotate={() => PI}
      spacing={2}
      spacingType={"count"}
    />
  );
}
