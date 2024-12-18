export default function Section({
  children,
  className,
  innerClassName,
  fullWidth = false,
  columns = false
}: React.PropsWithChildren & {
  title?: string
  className?: string
  innerClassName?: string
  fullWidth?: boolean
  columns?: boolean
  level?: number
}) {
  return (
    <div
      className={`w-full my-2 flex-none space-y-2 px-8 leading-6 ${
        !fullWidth ? 'mx-auto max-w-4xl' : ''
      } ${className ?? ''}`}>
      <div className={`w-full ${columns ? 'flex' : ''} ${innerClassName}`}>
        {children}
      </div>
    </div>
  )
}
