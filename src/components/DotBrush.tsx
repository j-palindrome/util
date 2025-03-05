import { extend, ThreeElement, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import {
  Break,
  float,
  floor,
  Fn,
  If,
  instancedArray,
  instanceIndex,
  int,
  Loop,
  max,
  remap,
  Return,
  screenSize,
  uv,
  varying,
  vec2,
  vec4,
  vertexIndex,
} from "three/tsl";
import {
  SpriteNodeMaterial,
  StorageInstancedBufferAttribute,
  WebGPURenderer,
} from "three/webgpu";
import { GroupBuilder } from "../builders/GroupBuilder";
import { useCurve, usePoints } from "../util/useControlPoints";
import { gaussian } from "../util/gaussian";

type VectorList = [number, number];
type Vector3List = [number, number, number];
export type Jitter = {
  size?: VectorList;
  position?: VectorList;
  hsl?: Vector3List;
  a?: number;
  rotation?: number;
};

extend({ StorageInstancedBufferAttribute });
declare module "@react-three/fiber" {
  interface ThreeElements {
    storageInstancedBufferAttribute: ThreeElement<
      typeof StorageInstancedBufferAttribute
    >;
  }
}

export default function DotBrush<K extends Record<string, any>>({
  params = {} as K,
  ...settings
}: { params?: K } & Partial<GroupBuilder<"dot", K>["settings"]>) {
  const builder = new GroupBuilder("dot", settings, params);
  // @ts-ignore
  const gl = useThree(({ gl }) => gl as WebGPURenderer);

  const { curveColorArray, curvePositionArray } = usePoints(builder);

  const { mesh } = useMemo(() => {
    const MAX_INSTANCE_COUNT =
      builder.settings.maxPoints * builder.settings.maxCurves;

    const geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
    geometry.translate(builder.settings.align - 0.5, 0.5, 0);
    const material = new SpriteNodeMaterial({
      transparent: true,
      depthWrite: false,
      // blending: THREE.AdditiveBlending
    });
    material.mrtNode = builder.settings.renderTargets;
    const mesh = new THREE.InstancedMesh(
      geometry,
      material,
      MAX_INSTANCE_COUNT,
    );

    material.mrtNode = builder.settings.renderTargets;

    const thickness = float(0).toVar();
    const color = varying(vec4(), "color");
    const progress = varying(float(), "progress");

    const position = vec2().toVar();
    material.positionNode = Fn(() => {
      progress.assign(instanceIndex.toFloat().div(builder.settings.maxPoints));
      position.assign(curvePositionArray.element(instanceIndex).xy);
      thickness.assign(
        curvePositionArray.element(instanceIndex).w.div(screenSize.x),
      );
      color.assign(curveColorArray.element(instanceIndex));

      return vec4(
        builder.settings.pointPosition(
          position.sub(vec2(0, thickness.div(2))),
          {
            progress,
            builder,
          },
        ),
        0,
        1,
      );
    })();

    material.scaleNode = vec2(thickness, thickness);
    material.colorNode = builder.settings.pointColor(
      vec4(color.xyz, gaussian(uv().sub(0.5).length()).mul(color.a)),
      {
        progress,
        builder,
        uv: varying(vec2(progress, 0.5), "uv"),
      },
    );
    material.needsUpdate = true;

    return {
      mesh,
    };
  }, [builder]);

  const scene = useThree(({ scene }) => scene);
  useEffect(() => {
    scene.add(mesh);
    return () => {
      scene.remove(mesh);
      mesh.dispose();
    };
  }, [builder]);

  return <></>;
}
