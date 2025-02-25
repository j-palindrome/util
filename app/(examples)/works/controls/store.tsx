import { createStore } from '@libs/oscPresets/modules/store'
import config from './config'

export const { OscPresets, OscFrame, useSocket } = createStore(config)
