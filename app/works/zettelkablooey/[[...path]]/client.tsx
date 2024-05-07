'use client'

import { Fragment, Suspense, useRef, useState } from 'react'
import { useFlicker } from './(services)/animation'
import { useDimensions } from './(services)/dom'
import { useSelectedLayoutSegments } from 'next/navigation'
import Link from 'next/link'
import { fetchPaths } from './page'

import AlterEgo from './(scenes)/alterEgo'
import Assured from './(scenes)/assured'
import Chance from './(scenes)/chance'
import Communication from './(scenes)/communication'
import GrowthFromInside from './(scenes)/growthFromInside'
import Linking from './(scenes)/linking'
import NoAnswer from './(scenes)/noAnswer'
import OrderDisorder from './(scenes)/orderDisorder'
import Ordering from './(scenes)/ordering'
import Registry from './(scenes)/registry'
import Systems from './(scenes)/systems'
import WithoutOrder from './(scenes)/withoutOrder'
import Zettelkasten from './(scenes)/zettelkasten'
import Kablooey from './(components)/Kablooey'

export const scenes = {
  'alter-ego': {
    el: (props: Props) => <AlterEgo {...props} />,
    prompt: 'Are you conscious?'
  },
  assured: {
    el: (props: Props) => <Assured {...props} />,
    prompt: 'Give me assurance for the future.'
  },
  change: {
    el: (props: Props) => <Chance {...props} />,
    prompt: 'What is up to chance?'
  },
  communication: {
    el: (props: Props) => <Communication {...props} />,
    prompt: 'What is the truest way to communicate?'
  },
  'growth-from-inside': {
    el: (props: Props) => <GrowthFromInside {...props} />,
    prompt: 'Do you have to throw up?'
  },
  lining: {
    el: (props: Props) => <Linking {...props} />,
    prompt: 'What describes a connection?'
  },
  'no-answer': {
    el: (props: Props) => <NoAnswer {...props} />,
    prompt: 'Is the world inherently good or evil?'
  },
  'order-disorder': {
    el: (props: Props) => <OrderDisorder {...props} />,
    prompt: 'Is the world inherently chaotic or lawful?'
  },
  ordering: {
    el: (props: Props) => <Ordering {...props} />,
    prompt: 'Describe the ideal order.'
  },
  registry: {
    el: (props: Props) => <Registry {...props} />,
    prompt: 'What is the best way to store tags in a database?'
  },
  systems: {
    el: (props: Props) => <Systems {...props} />,
    prompt: "Explain Luhmann's systems theory."
  },
  'without-order': {
    el: (props: Props) => <WithoutOrder {...props} />,
    prompt: 'Is there order in the world?'
  },
  zettelkasten: {
    el: (props: Props) => <Zettelkasten {...props} />,
    prompt: 'Why is the Zettelkasten useful?'
  },
  index: {
    el: (props: Props) => (
      <Kablooey title='index' {...props}>
        {`zettelkasten
        kann hier nicht deduktiv, nicht aus einer Obersicht...nicht durch Auswahl der besten geantwortet werden.
        Verweisungsmoglichkeiten
        den Prozeß des Wiederfindens
        Stellordnung
        gegen eine systematische Ordnung
        Systemtheorie
        Aber Kommunikation?
        Inkorporierung von Zufall
        eine Art Zweitgedächtnis, ein alter Ego
        die entsprechende Kombination von Ordnung und Unordnung
        Wachstum nach innen
        können wir bestätigen.`}
      </Kablooey>
    ),
    prompt: 'What is a Zettelkasten?'
  }
}

export default function ClientIndex({
  paths
}: {
  paths: Awaited<ReturnType<typeof fetchPaths>>
}) {
  const { w } = useDimensions()
  console.log('width:', w)

  const titleRef = useRef<HTMLButtonElement>(null)
  useFlicker(titleRef, {
    go: true,
    key: 'opacity',
    from: { max: 1, min: 0 },
    to: { max: 0, min: 0 },
    duration: 600
  })

  return (
    <div className='relative h-screen w-screen child:absolute'>
      <Link
        href={'zettelkablooey/index/'}
        className='left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
        style={{
          fontSize: ((w * 2) / 'zettelkablooey'.length) * 0.25
        }}>
        zettelkablooey
      </Link>

      {paths.map((path, i) => (
        <Fragment key={path.id + i}>
          {scenes[path.id].el({ ...path.props, index: i })}
        </Fragment>
      ))}
    </div>
  )
}
