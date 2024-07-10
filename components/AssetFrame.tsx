import { AssetInfo } from '@/sanity/sanity-types'
import ViewButton from './ViewButton'
import assetInfo from '../sanity/schemas/type/assetInfo'
import PDF from './PDF'
import SanityImageWrapper from './SanityImageWrapper'
import { sanityFileInfo } from '@/sanity/queries/utilities'

export default function AssetFrame({ assetInfo }: { assetInfo: AssetInfo }) {
  if (!assetInfo.embed) {
    let url = sanityFileInfo(
      assetInfo.assetType === 'file'
        ? assetInfo.uploadSource?.asset?._ref!
        : assetInfo.assetType === 'link'
          ? assetInfo.linkSource!
          : assetInfo.assetType === 'image'
            ? assetInfo.imageSource?.asset?._ref!
            : ''
    ).url
    return <ViewButton href={url}>{assetInfo.title ?? 'See more'}</ViewButton>
  } else {
    let child: JSX.Element
    switch (assetInfo.assetType) {
      case 'image':
        if (!assetInfo.imageSource?.asset) return <></>
        child = (
          <SanityImageWrapper
            className='w-full'
            id={assetInfo.imageSource?.asset?._ref!}
          />
        )
        break
      case 'file':
        if (!assetInfo.uploadSource?.asset) return <></>
        const info = sanityFileInfo(assetInfo.uploadSource.asset?._ref)
        switch (info.type) {
          case 'pdf':
            child = <PDF src={info.url} />
            break
          case 'video':
            child = (
              <video className='w-full aspect-video' controls src={info.url} />
            )
            break
          case 'audio':
            child = <audio className='w-full' controls src={info.url} />
            break
          case 'image':
            child = <img className='w-full' src={info.url} />
            break
          default:
            child = <object data={info.url} className='w-full aspect-video' />
        }
        return (
          <div className='w-full'>
            {assetInfo.title && <h3 className='text-h3'>{assetInfo.title}</h3>}
            {child}
          </div>
        )
      case 'link':
        if (!assetInfo.linkSource) return <></>
        return (
          <div className='w-full'>
            {assetInfo.title && <h3 className='text-h3'>{assetInfo.title}</h3>}
            <iframe
              className='w-full aspect-video min-h-[200px] max-h-[700px]'
              src={assetInfo.linkSource}
            />
          </div>
        )
      case 'html':
        if (!assetInfo.htmlSource) return <></>
        return (
          <div className='w-full'>
            {assetInfo.title && <h3 className='text-h3'>{assetInfo.title}</h3>}
            <div
              className='w-full *:mx-auto'
              dangerouslySetInnerHTML={{ __html: assetInfo.htmlSource! }}
            />
          </div>
        )
    }
  }
}
