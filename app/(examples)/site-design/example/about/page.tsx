import Section from '@/components/Section'
import Client from './client'

export default async function About() {
  return (
    <>
      <Client />
      <Section className=''>
        <div className='w-full px-2 flex flex-col items-center'></div>
        <div className='textBox'>Your bio can go here.</div>
        {
          // map the array of work experiences to div elements to display them
          [{ name: 'Sample project', description: 'sample description' }].map(
            project => (
              <div key={project.name} className='textBox'>
                <h2 className='text-h3'>{project.name}</h2>
                {project.description && <div>{project.description}</div>}
              </div>
            )
          )
        }
        {/* {about.cv && (
          <ViewButton href={sanityFileInfo(about.cv!.asset!._ref!).url}>
            CV
          </ViewButton>
        )} */}
      </Section>
    </>
  )
}
