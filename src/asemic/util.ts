import { useThree } from '@react-three/fiber'
import { Vector2 } from 'three'

export default function useHeight() {
  const size = new Vector2()
  useThree(state => state.gl.getDrawingBufferSize(size))
  return size.y / size.x
}
