import { SanityImage } from 'sanity-image'
import SanityImageWrapper from './SanityImageWrapper'
import { Color } from '@/sanity.types'

const assembleGradient = (gradient: {
  type: 'radial' | 'diagonal' | 'horizontal' | 'vertical'
  color1: Color
  color2: Color
}) => {
  const hexString = `${gradient.color1.hex}, ${gradient.color2.hex}`
  switch (gradient.type) {
    case 'radial':
      return `radial-gradient(${hexString})`
    case 'diagonal':
      return `linear-gradient(to bottom right, ${hexString})`
    case 'horizontal':
      return `linear-gradient(${hexString})`
    case 'vertical':
      return `linear-gradient(to bottom, ${hexString})`
  }
}

export default function BannerFrame() {
  const fullHeight = 'absolute top-0 left-0 -z-10 h-full w-full'
  switch (banner.bannerType) {
    case 'none':
      return <div className='h-full w-full bg-bg' />
    case 'image':
      return (
        banner.image?.asset && (
          <SanityImageWrapper
            id={banner.image.asset._ref}
            className={`${fullHeight} object-cover`}
          />
        )
      )
    case 'video':
      return (
        banner.video?.asset && (
          <video
            className='h-full w-full object-cover'
            muted
            loop
            autoPlay
            src={sanityFileInfo(banner.video.asset._ref).url}></video>
        )
      )
    case 'gradient':
      return (
        banner.gradient && (
          <div
            className={`${fullHeight}`}
            style={{
              background: assembleGradient(banner.gradient)
            }}></div>
        )
      )
    case 'custom':
      return (
        banner.custom && (
          <div
            className={`${fullHeight}`}
            dangerouslySetInnerHTML={{ __html: banner.custom }}></div>
        )
      )
  }
}
