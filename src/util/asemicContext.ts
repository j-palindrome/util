import { createContext } from 'react'
import SceneBuilder from '../builders/SceneBuilder'

export type AsemicContextType = {
  audio: SceneBuilder['audio']
  // recording: boolean
  // frameloop: 'never' | 'always'
  // setFrameloop: (fl: 'never' | 'always') => void
}
export const AsemicContext = createContext<AsemicContextType>(null!)
