import WebRenderer from '@elemaudio/web-renderer'

export const generateContexts = (
  el: HTMLCanvasElement,
  audioOptions: Parameters<WebRenderer['initialize']>[1],
): Promise<{
  ctx: AudioContext
  core: WebRenderer
  gl: WebGL2RenderingContext
  p5: any
}> => {
  const ctx = new AudioContext()
  const core = new WebRenderer()
  const gl = el.getContext('webgl2')!
  core.initialize(ctx, audioOptions).then((node) => {
    node.connect(ctx.destination)
  })

  return new Promise((res) => {
    core.on('load', async () => {
      const p5 = (await import('p5')).default
      res({
        ctx,
        core,
        gl,
        p5: p5 as any,
      })
    })
  })
}
