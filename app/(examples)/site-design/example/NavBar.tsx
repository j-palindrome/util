'use client'

import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { useSelectedLayoutSegment } from 'next/navigation'
import { useState } from 'react'

export default function NavBar({ title }: { title: string }) {
  const segment = useSelectedLayoutSegment()
  const [nav, setNav] = useState(false)

  const baseUrl = '/site-design/example/'

  return (
    <>
      <nav className='sticky top-0 left-0 w-full z-20'>
        <div className='w-full space-x-6 px-2 h-12 py-1 z-10 relative font-heading items-center sm:flex hidden'>
          <Link
            href={baseUrl}
            className='text-xl font-heading uppercase text-green-400 font-bold tracking-wide'
            style={{
              textShadow: '2px 2px green'
            }}>
            {title}
          </Link>
          <div className='grow'></div>
          <Link
            href={baseUrl + 'work'}
            className={`${segment === 'work' ? 'heading-accent' : 'heading'}`}>
            work
          </Link>
          <Link
            href={baseUrl + 'about'}
            className={`${segment === 'about' ? 'heading-accent' : 'heading'}`}>
            about
          </Link>
          <Link
            href={baseUrl + 'news'}
            className={`${segment === 'news' ? 'heading-accent' : 'heading'}`}>
            news
          </Link>
          <div className='grow'></div>
          {/* <Socials socials={socials} /> */}
          <button className='button !h-10'>
            <Link href={baseUrl + 'contact'}>Contact</Link>
          </button>
        </div>
        <div className='sm:hidden flex w-full z-30 relative'>
          <div className='grow'></div>
          <Link
            href={baseUrl}
            className='text-xl font-heading uppercase text-green-400 font-bold tracking-wide'
            style={{
              textShadow: '2px 2px green'
            }}>
            {title}
          </Link>
          <div className='grow'></div>
          <button onClick={() => setNav(!nav)}>
            {nav ? (
              <X className='h-full w-full' />
            ) : (
              <Menu className='h-full w-full' />
            )}
          </button>
        </div>
        {nav && (
          <div className='h-screen w-screen bg-bg/80 backdrop-blur fixed top-0 left-0 flex flex-col justify-around items-center z-20'>
            <div className='h-[5%]'></div>
            <Link
              onClick={() => setNav(false)}
              href={baseUrl + 'work'}
              className={`block ${segment === 'work' ? 'heading-accent' : 'heading'}`}>
              work
            </Link>
            <Link
              onClick={() => setNav(false)}
              href={baseUrl + 'about'}
              className={`block ${segment === 'about' ? 'heading-accent' : 'heading'}`}>
              about
            </Link>
            <Link
              onClick={() => setNav(false)}
              href={baseUrl + 'news'}
              className={`block ${segment === 'news' ? 'heading-accent' : 'heading'}`}>
              news
            </Link>
            <button className='button' onClick={() => setNav(false)}>
              <Link href={baseUrl + 'contact'}>Contact</Link>
            </button>
            <div className='h-[5%]'></div>
          </div>
        )}
      </nav>
    </>
  )
}
