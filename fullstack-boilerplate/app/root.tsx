import { Links, Meta, Outlet, Scripts } from '@remix-run/react'
import { LinksFunction } from '@remix-run/react/dist/routeModules'
import styles from './index.css?url'

export const links: LinksFunction = () => [
  {
    rel: 'stylesheet',
    href: styles
  }
]

export default function App() {
  return (
    <html>
      <head>
        <link rel='icon' href='data:image/x-icon;base64,AA' />
        <Meta />
        <Links />
      </head>
      <body>
        <h1>Hello world!</h1>
        <Outlet />

        <Scripts />
      </body>
    </html>
  )
}
