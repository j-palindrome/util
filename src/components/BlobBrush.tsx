import { extend, ThreeElement, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import {
  float,
  Fn,
  If,
  rotateUV,
  select,
  uniformArray,
  varying,
  vec2,
  vec4,
  vertexIndex,
} from "three/tsl";
import {
  MeshBasicNodeMaterial,
  StorageInstancedBufferAttribute,
  WebGPURenderer,
} from "three/webgpu";
import { GroupBuilder } from "../builders/GroupBuilder";
import { useCurve } from "../util/useControlPoints";
import { range } from "lodash";

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

export default function BlobBrush<T extends Record<string, any>>({
  params = {} as T,
  ...settings
}: { params?: T } & Partial<GroupBuilder<"blob", T>["settings"]>) {
  const builder = new GroupBuilder("blob", settings, params);
  // @ts-ignore
  const gl = useThree(({ gl }) => gl as WebGPURenderer);

  const { getBezier, instancesPerCurve, hooks } = useCurve(builder);
  const { material, geometry } = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([], 3));
    const indexes: number[] = [];

    for (let curveI = 0; curveI < builder.settings.maxCurves; curveI++) {
      for (let i = 1; i < instancesPerCurve - 1; i++) {
        indexes.push(
          curveI,
          curveI + i + builder.settings.maxCurves,
          curveI + i + 1 + builder.settings.maxCurves,
        );
      }
      indexes.push(
        curveI,
        curveI + 1 + builder.settings.maxCurves,
        curveI + instancesPerCurve - 1 + builder.settings.maxCurves,
      );
    }
    console.log(indexes);

    geometry.setIndex(indexes);
    const material = new MeshBasicNodeMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
      color: "white",
    });
    material.mrtNode = builder.settings.renderTargets;

    const position = vec2().toVar("thisPosition");
    const color = varying(vec4(), "color");
    const progress = varying(float(), "progress");
    const vUv = varying(vec2(), "vUv");

    const centerPoints = uniformArray(
      range(builder.settings.maxCurves).map(() => new THREE.Vector2()),
      "vec2",
    );
    const centerColors = uniformArray(
      range(builder.settings.maxCurves).map(() => new THREE.Vector4()),
      "vec4",
    );
    const updateCenterPoints = () => {
      const array = centerPoints.array as THREE.Vector2[];
      const colorArray = centerColors.array as THREE.Vector4[];
      for (let i = 0; i < builder.settings.maxCurves; i++) {
        switch (builder.settings.centerMode) {
          case "center":
            const bounds = builder.getBounds(builder.curves[i]);
            array[i].copy(bounds.center);
            colorArray[i].set(
              ...builder.curves[i][0].color,
              builder.curves[i][0].alpha,
            );
            break;
          case "first":
            array[i].copy(builder.curves[i][0]);
            colorArray[i].set(
              ...builder.curves[i][0].color,
              builder.curves[i][0].alpha,
            );
            break;
          case "betweenEnds":
            const lastPoint = builder.curves[i][builder.curves[i].length - 1];
            array[i].lerpVectors(builder.curves[i][0], lastPoint, 0.5);
            colorArray[i].set(
              ...builder.curves[i][0].color,
              builder.curves[i][0].alpha,
            );
            const lastColor = new THREE.Vector4(
              ...lastPoint.color,
              lastPoint.alpha,
            );
            colorArray[i].lerp(lastColor, 0.5);
            break;
        }
      }
    };
    hooks.onInit = () => {
      updateCenterPoints();
    };

    const main = Fn(() => {
      If(vertexIndex.lessThan(builder.settings.maxCurves), () => {
        position.assign(centerPoints.element(vertexIndex));
        color.assign(centerColors.element(vertexIndex));
        vUv.assign(vec2(0, 0));
      }).Else(() => {
        getBezier(
          vertexIndex
            .sub(builder.settings.maxCurves)
            .toFloat()
            .div(instancesPerCurve - 0.999),
          position,
          {
            color,
            progress,
          },
        );
        vUv.assign(
          vec2(
            vertexIndex
              .sub(builder.settings.maxCurves)
              .toFloat()
              .div(instancesPerCurve - 0.999),
            1,
          ),
        );
      });

      return vec4(position, 0, 1);
    });

    material.positionNode = main();

    material.colorNode = Fn(() =>
      builder.settings.pointColor(varying(vec4(), "color"), {
        progress,
        builder,
        uv: vUv,
      }),
    )();

    material.needsUpdate = true;

    return {
      material,
      geometry,
    };
  }, [builder]);

  const scene = useThree(({ scene }) => scene);
  useEffect(() => {
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    return () => {
      scene.remove(mesh);
      material.dispose();
      geometry.dispose();
    };
  }, [builder]);

  return <></>;
}
