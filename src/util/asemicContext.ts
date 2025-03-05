import { createContext } from "react";
import SceneBuilder from "../builders/Builder";

export type AsemicContextType = {
  audio: SceneBuilder<any>["audio"];
  // recording: boolean
  // frameloop: 'never' | 'always'
  // setFrameloop: (fl: 'never' | 'always') => void
};
export const AsemicContext = createContext<AsemicContextType>(null!);
