import Section from '@/components/Section'
import { sanityFetch } from '@/sanity/lib/fetch'
import { X } from 'lucide-react'
import Link from 'next/link'
import invariant from 'tiny-invariant'

export default async function Event({ params }) {
  return (
    <>
      <div className='w-screen h-screen fixed top-0 left-0 p-8 z-10'>
        <Link
          className='h-full w-full bg-black/50 backdrop-blur top-0 left-0 absolute'
          href='/news'
        />
        <div className='bg-bg/80 backdrop-blur border rounded-lg border-accent overflow-y-auto h-full w-full relative'>
          <button className='sticky top-2 left-[calc(100%-40px)] rounded-lg bg-accent2 hover:bg-accent transition-colors duration-200 aspect-square h-8 w-8'>
            <Link href='/news'>
              <X className='h-full w-full invert'></X>
            </Link>
          </button>
          <Section>
            <h2 className='text-h1'>Sample Event</h2>
            <div>Sample Subtitle</div>
          </Section>
          <Section className='mt-8'>
            <div>Event content</div>
          </Section>
        </div>
      </div>
    </>
  )
}
