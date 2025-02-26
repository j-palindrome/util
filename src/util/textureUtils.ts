import { WebGPURenderer } from 'three/src/Three.WebGPU.js'

export async function copyGPUTextureToBuffer(
  renderer: WebGPURenderer,
  gpuTexture: GPUTexture,
  x = 0,
  y = 0,
  faceIndex = 0,
  width = 0,
  height = 0
) {
  if (!width) width = gpuTexture.width
  if (!height) height = gpuTexture.height
  const device = renderer.backend.device

  const bytesPerTexel = renderer.backend.textureUtils._getBytesPerTexel(
    gpuTexture.format
  )

  let bytesPerRow = width * bytesPerTexel
  bytesPerRow = Math.ceil(bytesPerRow / 256) * 256 // Align to 256 bytes

  const readBuffer = device.createBuffer({
    size: width * height * bytesPerTexel,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
  })

  const encoder = device.createCommandEncoder()

  encoder.copyTextureToBuffer(
    {
      texture: gpuTexture,
      origin: { x, y, z: faceIndex }
    },
    {
      buffer: readBuffer,
      bytesPerRow: bytesPerRow
    },
    {
      width: width,
      height: height
    }
  )

  const typedArrayType = renderer.backend.textureUtils._getTypedArrayType(
    gpuTexture.format
  )

  device.queue.submit([encoder.finish()])

  await readBuffer.mapAsync(GPUMapMode.READ)

  const buffer = readBuffer.getMappedRange()

  // return buffer
  return new typedArrayType(buffer)
}
