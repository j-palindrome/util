import Link from 'next/link'

export default function LinkFrame({
  className,
  innerClassName,
  title,
  subtitle,
  href
}: {
  className?: string
  innerClassName?: string
  href: string
  title: string
  subtitle: string | null
}) {
  return (
    <div className={`${className}`}>
      <div className={`relative ${innerClassName}`}>
        <Link className='absolute top-0 left-0 h-full w-full' href={href} />
        <h2 className='text-h3'>{title}</h2>
        <div className='text-sm'>{subtitle}</div>
      </div>
    </div>
  )
}
