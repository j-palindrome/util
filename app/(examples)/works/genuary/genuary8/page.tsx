"use client";

import { Asemic, AsemicCanvas } from "@/libs/asemic/src/Asemic";
import ParticlesBrush from "@/libs/asemic/src/ParticlesBrush";

export default function Genuary8() {
  return (
    <AsemicCanvas dimensions={[1080, 1920]}>
      <ParticlesBrush />
    </AsemicCanvas>
  );
}
