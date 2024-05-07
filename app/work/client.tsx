'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { Pt } from 'pts'
import { useSelectedLayoutSegment } from 'next/navigation'

function Blob({
  to,
  order,
  role
}: {
  to: string
  order: number
  role: string | null
}) {
  const position = useMemo(
    () => new Pt(0, -0.25).rotate2D((order / 3) * Math.PI * 2),
    [order]
  )

  return (
    <Link
      href={'/work/' + to}
      scroll={false}
      className={`font-heading h-[50%] min-h-[100px] aspect-square !transition-[transform,left,top,border-color] !duration-500 circle -translate-x-1/2 -translate-y-1/2 absolute hover:scale-125 hover:brightness-125 hover:z-10 ${role === to ? 'scale-125 brightness-125 border-white' : 'border-transparent'} border !bg-slate-700/50`}
      style={{
        left: !role
          ? `calc(50% + ${position.x * 100}vh)`
          : `${order * 33 + 16}%`,
        top: !role ? `calc(50% + ${position.y * 100}vh)` : `50%`
      }}>
      {to}
    </Link>
  )
}

export default function Client() {
  const role = useSelectedLayoutSegment()

  return (
    <div
      className={`${role ? 'h-[150px]' : 'h-[calc(100vh-100px)]'} transition-[height] duration-500 flex items-center justify-around -mt-2 relative`}>
      <Link href='/work' className='absolute top-0 left-0 h-full w-full'></Link>
      <Blob to='artist' order={0} role={role} />
      <Blob to='researcher' order={1} role={role} />
      <Blob to='designer' order={2} role={role} />
    </div>
  )
}
