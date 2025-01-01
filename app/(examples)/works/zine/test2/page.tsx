'use client'
import { useEffect } from 'react'
import { init } from './script'

export default function Page() {
  useEffect(() => {
    init()
  }, [])
  return <></>
}
