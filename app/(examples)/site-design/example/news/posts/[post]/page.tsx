import Section from '@/components/Section'
import { X } from 'lucide-react'
import Link from 'next/link'

export default async function Post({ params }) {
  const postData = {
    title: 'sample title',
    subtitle: 'sample subtitle',
    content: 'sample content'
  }
  return (
    <>
      <div className='w-screen h-screen fixed top-0 left-0 sm:p-8 p-4 z-10'>
        <div className='bg-bg/80 backdrop-blur border rounded-lg border-accent overflow-y-auto h-full w-full relative'>
          <button className='sticky top-2 left-[calc(100%-40px)] rounded-lg bg-accent2 hover:bg-accent transition-colors duration-200 aspect-square h-8 w-8'>
            <Link href='/news'>
              <X className='h-full w-full invert'></X>
            </Link>
          </button>
          <Section>
            <h2 className='text-h1'>{postData.title}</h2>
            {postData.subtitle && <div>{postData.subtitle}</div>}
          </Section>
          <Section className='mt-8'>
            <div>{postData.content}</div>
          </Section>
        </div>
      </div>
    </>
  )
}
