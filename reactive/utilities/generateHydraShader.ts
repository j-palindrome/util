import HydraInstance from 'hydra-synth'
import { toES300 } from '../../src/shaders/utilities'

/**
 * Return a Hydra output. It will convert the output to glsl, then ES 300, then return it as a frag shader string.
 */
const generateHydraShader = (callback: (h: HydraInstance) => any) => {
  const hydra = new HydraInstance({
    makeGlobal: false,
    autoLoop: false,
    detectAudio: false
  })
  let fakeCanvas = document.querySelector(
    '[style="width: 100px; height: 80px; position: absolute; right: 0px; bottom: 0px;"]'
  )
  fakeCanvas?.remove()
  fakeCanvas = document.querySelector(
    '[style="width: 100%; height: 100%; image-rendering: pixelated;"]'
  )
  fakeCanvas?.remove()
  const shaderString = callback(hydra.synth)
  const s = toES300(shaderString.glsl()[0].frag)
    .replace(/uniform vec2 resolution;\n/, '')
    .replace(/in vec2 uv;\n/, '')
  console.log(hydra)

  return s
}
export default generateHydraShader
