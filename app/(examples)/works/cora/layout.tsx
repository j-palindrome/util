import '../../tailwind.css'
import Scene from './scene'

export const metadata = {
  title: 'Jay Reinier'
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang='en'>
      <body className='bg-black'>
        <Scene>{children}</Scene>
      </body>
    </html>
  )
}
