import { useState } from "react";

export default function Toggle({
  label,
  cb,
  className,
}: {
  label: string;
  cb: (state: boolean) => void;
  className?: string;
}) {
  const [state, setState] = useState(false);
  return (
    <button
      className={`${className}`}
      onClick={() => {
        setState(!state);
        cb(!state);
      }}
    >
      {label}
    </button>
  );
}
