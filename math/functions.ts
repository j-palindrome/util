export function waveform(value: number, frequency = 1, amplitude = 1) {
  return ((Math.sin(value * frequency) + 1) / 2) * amplitude
}
