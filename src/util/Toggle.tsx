import { useState } from "react";

export default function Toggle({
  label,
  cb,
}: {
  label: string;
  cb: (state: boolean) => void;
}) {
  const [state, setState] = useState(false);
  return (
    <button
      className={`rounded-lg p-2 transition-colors duration-500 ${
        state ? "bg-yellow-500 text-black" : "bg-black text-white"
      }`}
      onClick={() => {
        setState(!state);
        cb(!state);
      }}
    >
      {label}
    </button>
  );
}
