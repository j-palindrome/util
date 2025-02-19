"use client";
import { useAsemic } from "@/libs/asemic/src/Asemic";
import BlobBrush from "@/libs/asemic/src/BlobBrush";
// line that may or may not intersect
import { toTuple } from "@/libs/asemic/src/typeGuards";
import { Vector2 } from "three";
import LineBrush from "@/libs/asemic/src/LineBrush";
import PointBrush from "@/libs/asemic/src/DashBrush";
import { init } from "./bitonic-sort";

// grid-based graphic design
export default function Genuary30() {
  const { h, mouse } = useAsemic();
  init();
  return <></>;
}
