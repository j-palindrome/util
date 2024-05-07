import { useRef, useState } from 'react'
import { useFlicker } from '../(services)/animation'
import Link from 'next/link'

export default function MyLink({
  to,
  children,
  altText
}: {
  to: string
  altText?: string
  children: string
}) {
  const [isOver, setIsOver] = useState(false)
  const el = useRef<HTMLAnchorElement>(null)

  useFlicker(el, {
    go: isOver,
    from: { max: 1, min: 0 },
    key: 'opacity'
  })

  return (
    <Link
      href={to}
      onMouseEnter={() => setIsOver(true)}
      onMouseLeave={() => setIsOver(false)}
      ref={el}
      className='font-bold text-blue-400'>
      {isOver && altText ? altText : children}
    </Link>
  )
}
