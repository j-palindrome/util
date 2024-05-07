'use client'
import Link from 'next/link'
import { useSelectedLayoutSegments } from 'next/navigation'

export default function NavBar() {
  const segments = useSelectedLayoutSegments()
  if (segments.includes('works')) return <></>
  return (
    <nav className='flex space-x-6 px-2 py-2 w-full z-10 relative font-heading items-center'>
      <Link href='/' className='text-xl font-heading'>
        Jay Reinier
      </Link>
      <div className='grow'></div>
      <Link href='/site-design'>websites</Link>
      <Link href='/work'>work</Link>
      <Link href='/about'>about</Link>
      <button className='button'>
        <a href='mailto:jtreinier@gmail.com'>Contact</a>
      </button>
    </nav>
  )
}
