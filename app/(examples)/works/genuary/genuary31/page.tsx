"use client";
import { useAsemic } from "@/libs/asemic/src/Asemic";
// line that may or may not intersect
import { init } from "./bitonic-sort";

// grid-based graphic design
export default function Genuary30() {
  const { h, mouse } = useAsemic();
  init();
  return <></>;
}
