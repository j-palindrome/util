"use client";
import { AsemicCanvas } from "@/libs/asemic/src/Asemic";

export default function Scene({ children }) {
  return (
    <AsemicCanvas
      dimensions={["100vw", "100vh"]}
      useAudio={false}
      // highBitDepth={false}
      // className='cursor-none'
    >
      {children}
    </AsemicCanvas>
  );
}
