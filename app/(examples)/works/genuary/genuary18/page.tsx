"use client";
import { Asemic } from "@/libs/asemic/src/Asemic";
import SceneBuilder from "@/libs/asemic/src/Builder";
import { bloom } from "three/examples/jsm/tsl/display/BloomNode.js";

const builder = (b: SceneBuilder) => {
  b.newGroup(
    "attractors",
    (g) => {
      g.repeat(10, () => {
        g.newCurve({ thickness: 50 });
        g.repeat(3, () => g.newPoints(g.getRandomWithin([0, 0], [1, g.h])));
      });
    },
    { update: true, spacing: 0.1, recalculate: () => Math.random() * 1000 },
    { damping: 0.01, maxSpeed: 1 },
  );
};
export default function Genuary18() {
  return (
    <Asemic
      builder={builder}
      settings={{
        postProcessing: (input) => {
          return input.add(bloom(input, 0.2));
        },
      }}
    />
  );
}
