import '../../tailwind.css'

export default function Layout({ children }) {
  const style: React.CSSProperties & Record<`--${string}`, string> = {
    '--bg': '0 0 0',
    '--fg': '255 255 255',
    '--body': 'Cormorant Infant',
    '--heading': 'Dosis',
    '--accent': '55 166 84'
  }

  return (
    <html style={style}>
      <body className='bg-bg text-fg font-body text-base'>{children}</body>
    </html>
  )
}
