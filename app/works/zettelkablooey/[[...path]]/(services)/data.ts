import { DemoDataQueryResult } from '@/sanity.types'
import { sanityFetch } from '@/sanity/lib/fetch'
import { readFileSync, writeFile, writeFileSync } from 'fs'
import groq from 'groq'
import _ from 'lodash'
import { SanityDocument } from 'next-sanity'
import invariant from 'tiny-invariant'
import { BASE_FILE_URL } from '../../../../../constants/index'

export type Data = {
  posts: Record<string, string[]>
}

// let data = JSON.parse(
//   readFileSync(process.cwd() + '/public/data.json').toString('utf-8')
// ) as Data

// export function writeData(newData: Partial<Data>) {
//   data = { ...data, ...newData }
//   saveData()
// }

let allData: any = undefined
const demoDataQuery = groq`*[_type == 'demo' && slug.current == $id][0].files[]{'source': uploadSource.asset->url}`
export async function readResponse(post: string) {
  if (!allData) {
    const data = await sanityFetch<SanityDocument>({
      query: demoDataQuery,
      params: { id: 'zettelkablooey' }
    })
    invariant(data)

    const text = await (await fetch(data[0].source)).text()
    console.log('received:', text)

    const document = JSON.parse(text)
    allData = document
  }

  return _.sample(allData.posts[post]) ?? ''
}

// export function writeResponse(post: string, response: string) {
//   if (data.posts[post]) {
//     data.posts[post].push(response)
//   } else {
//     data.posts[post] = [response]
//   }
//   saveData()
// }

// function saveData() {
//   writeFileSync(process.cwd() + '/public/data.json', JSON.stringify(data))
// }
