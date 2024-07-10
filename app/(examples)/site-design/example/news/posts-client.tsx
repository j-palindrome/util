'use client'

import LinkFrame from '@/components/LinkFrame'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useState } from 'react'

export default function Posts() {
  const [start, setStart] = useState(0)
  const posts = [
    { _id: 'bla', title: 'sample', subtitle: 'sample', slug: 'post1' }
  ]

  return (
    <>
      <h1 className='text-h1 text-center heading'>Latest News</h1>
      {
        // Toggle between posts, so older ones can be loaded
      }
      {posts.slice(start, start + 10).map(post => (
        <LinkFrame
          className='textBox'
          key={post._id}
          title={post.title}
          subtitle={post.subtitle}
          href={`news/posts/${post.slug}`}
        />
      ))}
      <div className='w-full flex justify-between'>
        {start > 0 && (
          <button
            className='accent-button'
            onClick={() => setStart(Math.max(0, start - 10))}>
            <ArrowLeft />
          </button>
        )}
        {posts.length >= 10 && (
          <button
            className='accent-button'
            onClick={() => setStart(start + 10)}>
            <ArrowRight />
          </button>
        )}
      </div>
    </>
  )
}
