import { useThree } from '@react-three/fiber'
import { Vector2 } from 'three'

export function useHeight() {
  const size = useThree(state => state.size)
  const h = size.height / size.width
  return h
}
