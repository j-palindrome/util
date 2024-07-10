import LinkFrame from '@/components/LinkFrame'
import Section from '@/components/Section'
import { sanityFetch } from '@/sanity/lib/fetch'
import { sortBy } from 'lodash'
import Client from './client'
import Posts from './posts-client'

export default async function Layout({ children }) {
  // const posts = await sanityFetch<PostsQueryResult>({
  // query: postsQuery
  // })

  // const events = await sanityFetch<EventsQueryResult>({ query: eventsQuery })

  const today = new Date().toISOString().slice(0, 10)
  const events = [
    {
      date: '9999',
      title: 'Sample event',
      subtitle: 'subtitle',
      slug: 'sample'
    }
  ]

  return (
    <>
      <Client />
      <Section>
        <h1 className='text-h1 text-center heading'>Upcoming Events</h1>
        {sortBy(
          events.filter(event => event.date >= today),
          'date'
        ).map(event => (
          <LinkFrame
            className='textBox'
            key={event.title}
            title={event.title}
            subtitle={event.subtitle}
            href={`news/events/${event.slug}`}></LinkFrame>
        ))}
      </Section>
      <Section>
        {
          // making a client-side component for Posts so it can use state to toggle between them
        }
        <Posts />
      </Section>
      {children}
    </>
  )
}
