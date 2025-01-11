import { useEffect } from 'react'
import { Texture, VideoTexture } from 'three'

export class WebcamTexture {
  texture: VideoTexture
  constructor() {
    const video = new HTMLVideoElement()
    this.texture = new VideoTexture(video)
    video.muted = true
    video.autoplay = true
  }
}

type SrcKey = 'video' | 'stream' | 'cam' | 'screen'
type SrcProperties<T extends SrcKey> = {
  dimensions: [number, number]
} & (T extends 'video'
  ? { src: string }
  : T extends 'stream'
    ? { src: MediaStream }
    : T extends 'cam'
      ? { src: MediaStreamConstraints }
      : T extends 'screen'
        ? { src: DisplayMediaStreamOptions }
        : never)

class AsemicInput<T extends SrcKey> {
  dynamic = true
  width = 1080
  height = 1920
  src = new HTMLVideoElement()
  tex = new VideoTexture(this.src)

  constructor(type: T, props: SrcProperties<T>) {
    this.width = props.dimensions[0]
    this.height = props.dimensions[1]
    this.reInit()
    switch (type) {
      case 'cam':
        this.initCam((props as SrcProperties<'cam'>).src)
        break
      case 'screen':
        this.initScreen((props as SrcProperties<'screen'>).src)
        break
      case 'stream':
        this.initStream((props as SrcProperties<'stream'>).src)
        break
      case 'video':
        this.initVideo((props as SrcProperties<'video'>).src)
        break
    }
  }

  initCam(constraints: MediaStreamConstraints) {
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(stream => {
        this.src.srcObject = stream
        this.src.play()
      })
      .catch(function (error) {
        console.error('Unable to access the camera/webcam.', error)
      })
  }

  initVideo(url = '') {
    this.src.crossOrigin = 'anonymous'
    this.src.loop = true

    // const onload = this.src.addEventListener('loadeddata', () => {
    //   this.src.play()
    // })
    this.src.src = url
  }

  // TODO: figure out how to initialize a stream
  initStream(streamName) {
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
  initScreen(options?: DisplayMediaStreamOptions) {
    navigator.mediaDevices
      .getDisplayMedia(options)
      .then(stream => {
        this.src.srcObject = stream
      })
      .catch(err => console.log('could not get screen', err))
  }

  resize(width, height) {
    this.width = width
    this.height = height
    this.src.width = width
    this.src.height = height
    // needed?
    // this.tex.dispose()
    // this.tex = new VideoTexture(this.src)
  }

  reInit() {
    // if (this.src && this.src.srcObject) {
    //   if (this.src.srcObject.getTracks) {
    //     this.src.srcObject.getTracks().forEach(track => track.stop())
    //   }
    // }
    this.src?.remove()
    this.src = new HTMLVideoElement()
    this.src.width = this.width
    this.src.height = this.height
    this.src.muted = true
    this.src.autoplay = true
    this.src.loop = true
    this.tex?.dispose()
    this.tex = new VideoTexture(this.src)
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
