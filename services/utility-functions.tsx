import { Color } from '@/sanity.types'

export const formatColor = (color: Color) =>
  `${color.rgb?.r} ${color.rgb?.g} ${color.rgb?.b}`
