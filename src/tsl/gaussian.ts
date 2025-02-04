import { float, NodeRepresentation, PI2 } from 'three/tsl'

export function gaussian(
  input: NodeRepresentation,
  sigmaIn: NodeRepresentation = 0.15
) {
  const sigma = float(sigmaIn)
  const coefficient = float(1).div(sigma.pow(2).mul(PI2).sqrt())
  const exponent = float(input).pow(2).div(sigma.pow(2).mul(2)).negate()
  return coefficient.mul(exponent.exp())
}
