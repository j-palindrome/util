import { createContext } from 'react'
import SceneBuilder from '../Builder'

export type AsemicContextType = {
  audio: SceneBuilder<any>['audio']
}
export const AsemicContext = createContext<AsemicContextType>({
  audio: null
} as any)
