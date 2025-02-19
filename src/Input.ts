import { useEffect } from 'react'
import { SRGBColorSpace, Texture, VideoTexture } from 'three'

type SrcKey = 'video' | 'stream' | 'cam' | 'screen'
type SrcProperties<T extends SrcKey> = {
  dimensions: [number, number]
} & (T extends 'video'
  ? { src: string }
  : T extends 'stream'
    ? { src?: MediaStream }
    : T extends 'cam'
      ? { src?: MediaStreamConstraints }
      : T extends 'screen'
        ? { src?: DisplayMediaStreamOptions }
        : never)

export class AsemicInput<T extends SrcKey> {
  dynamic = true
  width = 1080
  height = 1920
  video!: HTMLVideoElement
  texture!: VideoTexture
  type: T
  props: SrcProperties<T>

  constructor(type: T, props: SrcProperties<T>) {
    this.width = props.dimensions[0]
    this.height = props.dimensions[1]
    this.type = type
    this.props = props
  }

  async initCam(constraints?: MediaStreamConstraints) {
    return await navigator.mediaDevices
      .getUserMedia(constraints)
      .then(stream => {
        this.video.srcObject = stream
        this.video.play()
      })
  }

  async initVideo(url: string) {
    this.video.src = url
    this.video.play()
    return new Promise(res => {
      this.video.addEventListener('loadeddata', () => {
        res(undefined)
      })
    })
  }

  // TODO: figure out how to initialize a stream
  async initStream(streamName) {
    //  console.log("initing stream!", streamName)
    let self = this
    // if (streamName && this.pb) {
    // this.pb.initSource(streamName)

    // this.pb.on('got video', function (nick, video) {
    //   if (nick === streamName) {
    //     self.src = video
    //     self.dynamic = true
    //     self.tex = self.regl.texture({ data: self.src, ...params})
    //   }
    // })
    // }
  }

  // index only relevant in atom-hydra + desktop apps
  async initScreen(options?: DisplayMediaStreamOptions) {
    const constraints = {}
    return await navigator.mediaDevices
      .getDisplayMedia(constraints)
      .then(stream => {
        this.video.srcObject = stream
        this.video.play()
      })
  }

  resize(width, height) {
    this.width = width
    this.height = height
    this.video.width = width
    this.video.height = height
    // needed?
    // this.tex.dispose()
    // this.tex = new VideoTexture(this.src)
  }

  async init() {
    // if (this.src && this.src.srcObject) {
    //   if (this.src.srcObject.getTracks) {
    //     this.src.srcObject.getTracks().forEach(track => track.stop())
    //   }
    // }
    this.video?.remove()
    this.video = document.createElement('video')
    this.video.style.display = 'none'
    document.body.appendChild(this.video)
    this.video.width = this.width
    this.video.height = this.height
    this.video.muted = true
    this.video.autoplay = true
    this.video.loop = true
    this.texture?.dispose()
    this.texture = new VideoTexture(this.video)

    switch (this.type) {
      case 'cam':
        await this.initCam((this.props as SrcProperties<'cam'>).src)
        break
      case 'screen':
        await this.initScreen((this.props as SrcProperties<'screen'>).src)
        break
      case 'stream':
        await this.initStream((this.props as SrcProperties<'stream'>).src)
        break
      case 'video':
        await this.initVideo((this.props as SrcProperties<'video'>).src)
        break
    }
    return this.texture
  }

  // tick (time) {
  //   //  console.log(this.src, this.tex.width, this.tex.height)
  //   if (this.src !== null && this.dynamic === true) {
  //     if (this.src.videoWidth && this.src.videoWidth !== this.tex.width) {
  //       console.log(
  //         this.src.videoWidth,
  //         this.src.videoHeight,
  //         this.tex.width,
  //         this.tex.height
  //       )
  //       this.tex.resize(this.src.videoWidth, this.src.videoHeight)
  //     }

  //     if (this.src.width && this.src.width !== this.tex.width) {
  //       this.tex.resize(this.src.width, this.src.height)
  //     }

  //     this.tex.subimage(this.src)
  //   }
  // }

  // getTexture () {
  //   return this.tex
  // }
}

export default AsemicInput
