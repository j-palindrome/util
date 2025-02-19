"use client";

import { Asemic, AsemicCanvas } from "@/libs/asemic/src/Asemic";
import AsemicInput from "@/libs/asemic/src/Input";
import { useHeight } from "@/libs/asemic/src/util";
import { Plane, useVideoTexture } from "@react-three/drei";
import { extend, Object3DNode, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import { SRGBColorSpace, Vector2, VideoTexture } from "three";
import {
  float,
  Fn,
  If,
  mx_noise_float,
  mx_noise_vec3,
  screenSize,
  texture,
  time,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
  viewportSize,
} from "three/tsl";
import { MeshBasicNodeMaterial } from "three/webgpu";
extend({ MeshBasicNodeMaterial });
declare module "@react-three/fiber" {
  interface ThreeElements {
    meshBasicNodeMaterial: Object3DNode<
      MeshBasicNodeMaterial,
      typeof MeshBasicNodeMaterial
    >;
  }
}

export default function Genuary7() {
  const [stream, setStream] = useState<VideoTexture | null>(null);
  useEffect(() => {
    new AsemicInput("screen", { dimensions: [1080, 1920] })
      .init()
      .then((tex) => setStream(tex));
  }, []);

  return (
    <>
      <AsemicCanvas dimensions={[1080, 1920]}>
        {stream && <Scene src={stream} />}
      </AsemicCanvas>
    </>
  );
}

function Scene({ src }) {
  const mat = useRef();
  const distance = uniform(0.5);
  useFrame(({ clock }) => {
    // distance.value = Math.sin(((clock.elapsedTime % 3) / 3) * Math.PI * 2)
  });
  const h = useHeight();
  useEffect(() => {
    mat.current.needsUpdate = true;
  });
  return (
    <mesh position={[0.5, 0.5 * h, 0]}>
      <meshBasicNodeMaterial
        ref={mat}
        fragmentNode={Fn(() => {
          const baseUv = uv()
            .sub(0.5)
            .mul(vec2(1, 2))
            .add(0.5)
            .add(
              vec2(
                mx_noise_vec3(vec2(uv().x.mul(5), time), 0.5).xy,
                // mx_noise_float(vec2(uv().y, time), 0.5)
              ).mul(vec2(0.3, 1)),
            )
            .toVar("baseUv");
          const thisNode = texture(src, baseUv).r;
          const alpha = float(1).toVar("a");
          If(
            texture(src, baseUv.add(vec2(0, 0.1).div(viewportSize)))
              .r.sub(thisNode)
              .abs()
              .lessThan(0.1)
              .and(
                texture(src, baseUv.add(vec2(distance, 0).div(viewportSize)))
                  .add(vec2(distance, 0).div(viewportSize))
                  .r.sub(thisNode)
                  .abs()
                  .lessThan(0.1),
              )
              .and(
                texture(src, baseUv.add(vec2(0, distance).div(viewportSize)))
                  .add(vec2(distance, 0).div(viewportSize))
                  .r.sub(thisNode)
                  .abs()
                  .lessThan(0.1),
              ),

            // .and(
            //   texture(src, uv().add(vec2(-distance, 0).div(viewportSize)))
            //     .add(vec2(distance, 0).div(viewportSize))
            //     .r.sub(thisNode)
            //     .abs()
            //     .lessThan(0.1)
            // )
            // .and(
            //   texture(src, uv().add(vec2(-distance, -distance).div(viewportSize)))
            //     .add(vec2(distance, 0).div(viewportSize))
            //     .r.sub(thisNode)
            //     .abs()
            //     .lessThan(0.1)
            // )
            // .and(
            //   texture(src, uv().add(vec2(-distance, distance).div(viewportSize)))
            //     .add(vec2(distance, 0).div(viewportSize))
            //     .r.sub(thisNode)
            //     .abs()
            //     .lessThan(0.1)
            // )
            // .and(
            //   texture(src, uv().add(vec2(distance, distance).div(viewportSize)))
            //     .add(vec2(distance, 0).div(viewportSize))
            //     .r.sub(thisNode)
            //     .abs()
            //     .lessThan(0.1)
            // )
            // .and(
            //   texture(src, uv().add(vec2(distance, -distance).div(viewportSize)))
            //     .add(vec2(distance, 0).div(viewportSize))
            //     .r.sub(thisNode)
            //     .abs()
            //     .lessThan(0.1)
            // ),
            () => {
              alpha.assign(0);
            },
          );
          return vec4(1, 1, 1, alpha);
        })()}
      />
      <planeGeometry args={[1, h]} />
    </mesh>
  );
}
