import WebRenderer from '@elemaudio/web-renderer'

export const generateContexts = (
  el: HTMLCanvasElement,
  audioOptions: Parameters<WebRenderer['initialize']>[1]
): Promise<{
  ctx: AudioContext
  core: WebRenderer
  gl: WebGL2RenderingContext
}> => {
  const ctx = new AudioContext()
  const core = new WebRenderer()
  const gl = el.getContext('webgl2')!
  core.initialize(ctx, audioOptions).then((node) => {
    node.connect(ctx.destination)
  })

  return new Promise((res) => {
    core.on('load', async () => {
      res({
        ctx,
        core,
        gl
      })
    })
  })
}
