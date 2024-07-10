import Client from './client'
import WorksHeader from './header'
import Works from './works'

export default async function Work({ children }) {
  return (
    <>
      {/*  header for categories */}
      <Client />

      <div className='w-full flex-none h-full overflow-y-auto flex flex-wrap'>
        <Works />
      </div>

      {children}
    </>
  )
}
