"use client";

import Asemic, { AsemicCanvas } from "@/libs/asemic/src/Asemic";
import Particles from "@/asemic/src/Particles";

export default function Genuary8() {
  return (
    <AsemicCanvas dimensions={[1080, 1920]}>
      <Particles />
    </AsemicCanvas>
  );
}
