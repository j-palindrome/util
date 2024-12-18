import _ from 'lodash'
import { Fragment, Suspense, cloneElement, useMemo } from 'react'
import { useDimensions } from '../(services)/dom'
import MyLink from './MyLink'
import MorphSpan from './MorphSpan'

export default function GptMesh(props: Parameters<typeof ClientGptMesh>[0]) {
  return (
    <Suspense fallback={<></>}>
      <ClientGptMesh {...props} />
    </Suspense>
  )
}

function ClientGptMesh({
  children,
  gptText
}: {
  children: JSX.Element[]
  gptText: string
}) {
  const { w, h } = useDimensions()
  /**
   * @description Splits up the text based on random locations, making room for each of the children.
   */
  const formattedGptText = useMemo(() => {
    if (!gptText) return undefined
    const area = (w / 8) * (h / 24)
    let fullLengthText = gptText
    while (fullLengthText.length < area) fullLengthText += fullLengthText
    const slicedGptText = fullLengthText.slice(0, area)

    const splitGptText = slicedGptText.split(' ')
    const splits: number[] = children
      .map(() => _.random(splitGptText.length, false))
      .sort()

    let currentSplit = 0
    const formattedGptText: string[] = []
    for (let split of splits) {
      formattedGptText.push(splitGptText.slice(currentSplit, split).join(' '))
      currentSplit = split
    }
    formattedGptText.push(splitGptText.slice(currentSplit).join(' '))

    return formattedGptText
  }, [gptText, children, h, w])

  if (!formattedGptText) return <></>
  return (
    <div className='h-full w-full overflow-hidden'>
      {children.map((child, i) => {
        const splitChildren = child.props.children.split(' ')
        const link = _.random(splitChildren.length)
        const newLink = (
          <MyLink key={i} to={'/demos/zettelkablooey/'}>
            {splitChildren[link]}
          </MyLink>
        )
        return (
          <Fragment key={i}>
            <MorphSpan>{formattedGptText[i]}</MorphSpan>
            {cloneElement(child, {
              children: [
                <span key={'item0'}>
                  {splitChildren.slice(0, link).join(' ') + ' '}
                </span>,
                newLink,
                <span key={'item1'}>
                  {' ' + splitChildren.slice(link + 1).join(' ')}
                </span>
              ]
            })}
          </Fragment>
        )
      })}
      <MorphSpan>{formattedGptText[formattedGptText.length - 1]}</MorphSpan>
    </div>
  )
}
