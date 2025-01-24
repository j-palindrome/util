import { createContext } from 'react'
import SceneBuilder from '../Builder'

export type AsemicContextType = {
  audio: SceneBuilder<any>['audio']
  recording: boolean
}
export const AsemicContext = createContext<AsemicContextType>(null!)
