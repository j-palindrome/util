"use client";
import Asemic from "@/libs/asemic/src/Asemic";
import { gaussianBlur } from "@/util/src/tsl/effects";
import { dimensions } from "@/util/src/tsl/utility";
import { vec2 } from "three/tsl";

export default function Genuary21() {
  // const gui = new GUI()
  // const strength = uniform(1)
  // gui.add({ strength: 1 }, 'strength', 0.1, 2).onChange(value => {
  //   strength.value = value
  //   strength.needsUpdate = true
  // })
  return (
    <Asemic
      builder={(b) => {
        // b.newGroup(
        //   'line',
        //   g => {
        //     g.newCurve([0, 1], [1, 1])
        //   },
        //   {
        //     curveVert: input => {
        //       return vec2(input.x, mx_noise_float(vec2(time, 0), 0.5, 0.5))
        //     },
        //     update: true
        //   }
        // )
        b.newGroup(
          "attractors",
          (g) => {
            g.newCurve([0, 0], [0, 1]);
          },
          {
            update: true,
            // maxLength: 2,
            spacing: 2,
            spacingType: "count",
            recalculate: () => Math.random() * 500,
          },
          {
            initialSpread: true,
            pointSize: 3,
            pointColor: [1, 1, 1],
            pointAlpha: 0.02,
            particleCount: 1.5e5,
            gravityForce: 0,
            damping: -0.2,
            maxSpeed: 1,
            minSpeed: 0.7,
            spinningForce: 0,
            pointVelocity: (velocity, position) => {
              const brightness = gaussianBlur(
                b.postProcessing.scenePass.getPreviousTextureNode("output"),
                position.div(dimensions),
                // quantize(position, 0.05),
                vec2(0.03).div(dimensions),
              ).r.mul(11);
              // return velocity
              return velocity.mul(brightness.oneMinus());
            },
          },
        );
      }}
      // settings={{
      //   postProcessing: input => {
      //     return afterImage(input.add(bloom(input, 0.1)), 0.7)
      //   }
      // }}
    />
  );
}
