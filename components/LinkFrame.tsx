import Link from 'next/link'

export default function LinkFrame({
  className,
  innerClassName,
  title,
  subtitle,
  // banner,
  href,
  children
}: {
  className?: string
  innerClassName?: string
  href: string
  title: string
  subtitle: string | null
  // banner?: BannerInfo | null
} & React.PropsWithChildren) {
  return (
    <div className={`${className}`}>
      <div className={`relative ${innerClassName}`}>
        <Link className='absolute top-0 left-0 h-full w-full' href={href} />
        <h2 className='text-h3'>{title}</h2>
        <div className='text-sm'>{subtitle}</div>
        {/* {banner && <BannerFrame banner={banner} />} */}
        {children}
      </div>
    </div>
  )
}
