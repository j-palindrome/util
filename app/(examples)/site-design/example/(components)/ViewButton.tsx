export default function ViewButton({
  children,
  href
}: React.PropsWithChildren & { href: string }) {
  return (
    <a className='p-4' href={href} target={'_blank'}>
      {children}
    </a>
  )
}
