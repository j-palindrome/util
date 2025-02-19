"use client";
import { useEffect, useRef, useState } from "react";
import { now } from "lodash";
import { Color } from "three";
import { slides } from "./slides";
import GroupBuilder from "@/libs/asemic/src/Builder";
import { useEventListener } from "@/libs/util/dom";
import Asemic from "@/libs/asemic/src/Asemic";
import PointBrush from "@/libs/asemic/src/DashBrush";

export default function DigiRis() {
  const [currentChild, setCurrentChild] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null!);

  const defaultFunc = (b: GroupBuilder) =>
    // @ts-ignore
    b.set({ thickness: 2, color: new Color("pink") });

  // useEffect(() => {
  //   const hydra = hydraRef.current.synth
  //   slides[currentChild]?.(hydra.src(hydra.s0)).out()
  // }, [currentChild])

  useEventListener(
    "keydown",
    (ev) => {
      console.log(ev.key);

      switch (ev.key) {
        case "ArrowLeft":
          setCurrentChild(currentChild - 1);
          break;
        case "ArrowRight":
          setCurrentChild(currentChild + 1);
          break;
      }
    },
    [currentChild],
  );

  return (
    <div className="bg-black">
      <div className="absolute left-0 top-0 h-full w-full">
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>
      {/* <Asemic builder={slides[currentChild].asemic?.[0] ?? (b) => b}>
      </Asemic> */}
      <div className="absolute left-0 top-0 z-10 h-full w-full font-mono font-bold text-pink-600">
        {slides[currentChild]?.slide}
      </div>
    </div>
  );
}
