import Client from './client'

export default function Work({ children }: React.PropsWithChildren & {}) {
  return (
    <>
      <Client />
      {children}
    </>
  )
}
