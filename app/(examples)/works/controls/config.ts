import type { Schema } from '../../libs/oscPresets/modules/store'

export default {
  '/crop': { type: 'xy', default: [0, 0], bounds: [400, 400] }
} satisfies Schema
