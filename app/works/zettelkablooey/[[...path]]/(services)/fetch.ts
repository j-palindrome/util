import { generatePrompt } from './gpt'

const prompts = {
  'alter-ego': {
    prompt: 'Are you conscious?'
  },
  assured: {
    prompt: 'Give me assurance for the future.'
  },
  change: {
    prompt: 'What is up to chance?'
  },
  communication: {
    prompt: 'What is the truest way to communicate?'
  },
  'growth-from-inside': {
    prompt: 'Do you have to throw up?'
  },
  lining: {
    prompt: 'What describes a connection?'
  },
  'no-answer': {
    prompt: 'Is the world inherently good or evil?'
  },
  'order-disorder': {
    prompt: 'Is the world inherently chaotic or lawful?'
  },
  ordering: {
    prompt: 'Describe the ideal order.'
  },
  registry: {
    prompt: 'What is the best way to store tags in a database?'
  },
  systems: {
    prompt: "Explain Luhmann's systems theory."
  },
  'without-order': {
    prompt: 'Is there order in the world?'
  },
  zettelkasten: {
    prompt: 'Why is the Zettelkasten useful?'
  },
  index: {
    prompt: 'What is a Zettelkasten?'
  }
}

let gptTexts: Partial<{ [k in keyof typeof prompts]: string }> = {}
export async function fetchPaths(segments: string[]) {
  const paths = segments.filter(path => path) as
    | (keyof typeof prompts)[]
    | undefined
  const mappedPaths: { id: keyof typeof prompts; props: Props }[] = []
  if (!paths) return []
  for (let id of paths) {
    let gptText: string
    if (!gptTexts[id]) {
      gptText = await generatePrompt(prompts[id].prompt)
      gptTexts[id] = gptText
    } else gptText = gptTexts[id] as string
    mappedPaths.push({
      id,
      props: { gptText, index: 0 }
    })
  }
  return mappedPaths
}
