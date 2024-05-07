'use client'

import { WorksQueryResult } from '@/sanity.types'
import { useEventListener } from '@util/dom'
import anime from 'animejs'
import { Pt } from 'pts'
import { useEffect, useRef, useState } from 'react'
import { BASE_URL } from '@/constants'
import Link from 'next/link'
import SanityImageWrapper from '@/components/SanityImageWrapper'

const itemWidth = 300
const margin = 24

export default function WorksDisplayClient({
  works,
  role
}: {
  works: WorksQueryResult
  role: string
}) {
  const frame = useRef<HTMLDivElement>(null)

  const [width, setWidth] = useState(0)
  const isTrapezoidal =
    works.length >= width * 2 ||
    (works.length > width && works.length % width === 0)

  const resize = () => {
    const newWidth = Math.min(
      works.length,
      Math.max(
        1,
        Math.floor(
          Math.min(window.innerWidth - itemWidth, 1000) / (itemWidth + margin)
        )
      )
    )
    if (width !== newWidth) {
      setWidth(newWidth)
    }
  }
  useEventListener('resize', resize, [works.length, width])
  useEffect(resize, [works, width])

  return (
    <div
      className='w-full pb-12'
      style={{ marginLeft: isTrapezoidal ? 0 : itemWidth / 4 }}>
      <div
        className={`mx-auto grid w-fit max-w-[1000px]`}
        style={{
          gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`
        }}
        ref={frame}>
        {works.map((work, i) => {
          let rowNumber = Math.floor(i / width)
          return (
            <Bubble
              key={work._id}
              {...{ rowNumber, work, itemWidth }}
              role={role}
            />
          )
        })}
      </div>
    </div>
  )
}

function Bubble({
  work,
  rowNumber,
  role
}: {
  work: WorksQueryResult[number]
  rowNumber: number
  role: string
}) {
  const left = rowNumber % 2 ? itemWidth / 4 : -itemWidth / 4

  const { title, subtitle, slug } = work
  const frame = useRef<HTMLDivElement>(null!)
  useEventListener(
    'mousemove',
    ev => {
      const position = frame.current.getBoundingClientRect()
      const toMouse = new Pt(
        position.left + position.width / 2,
        position.top + position.height / 2
      ).subtract(ev.clientX, ev.clientY)

      toMouse.scale(16 / toMouse.magnitude())
      frame.current.style.setProperty('left', `${left + toMouse.x}px`)
      frame.current.style.setProperty('top', `${toMouse.y}px`)
      // anime({
      //   target: frame.current,
      //   left: `${left + toMouse.x}px`,
      //   top: `${toMouse.y}px`,
      //   // easing: 'spring(1, 80, 10, 0)',
      //   duration: 10,
      // })
    },
    [left]
  )

  useEffect(() => {
    anime({
      targets: frame.current,
      scale: [0, 1],
      duration: 100
    })
  }, [work])

  return (
    <div
      ref={frame}
      data-spring={work._id}
      key={work._id}
      className={`relative flex aspect-square flex-none overflow-hidden rounded-full hover:z-10 circle`}
      style={{
        left,
        width: itemWidth,
        margin: `${margin / 2}px ${margin}px`
      }}>
      <Link
        className='relative z-10 flex h-full w-full flex-col items-center justify-center space-y-2 px-2'
        href={`${role}/${slug!.current!}`}
        scroll={false}>
        <div className='rounded-lg bg-black/50 px-1 text-center font-heading text-xl shadow-lg'>
          {title}
        </div>
        <div className='rounded-lg bg-black/50 px-1 text-center font-heading text-sm text-gray-200 shadow-lg'>
          {subtitle}
        </div>
      </Link>

      <div className='w-full h-full absolute top-0 left-0'>
        {work.videoBannerURL ? (
          <video
            src={work.videoBannerURL}
            muted
            autoPlay
            loop
            className='object-cover w-full h-full'
          />
        ) : (
          <SanityImageWrapper
            id={work.imageBanner!.asset!._ref}
            className='w-full h-full object-cover'
          />
        )}
      </div>
    </div>
  )
}
