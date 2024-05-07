import { Suspense } from 'react'
import ClientIndex from './client'

import { generatePrompt } from './(services)/gpt'
import dynamic from 'next/dynamic'
import { fetchPaths } from './(services)/fetch'

const ClientImport = dynamic(() => import('./client'), { ssr: false })
export default async function Zettelkablooey({
  params
}: {
  params: { path?: string[] }
}) {
  const paths = await fetchPaths(params.path ?? [])

  return (
    <>
      <ClientImport paths={paths} />
    </>
  )
}
