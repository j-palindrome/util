import _ from 'lodash'

const charFrequency = {
  a: 0.082,
  b: 0.015,
  c: 0.028,
  d: 0.043,
  e: 0.127,
  f: 0.022,
  g: 0.02,
  h: 0.061,
  i: 0.07,
  j: 0.015,
  k: 0.077,
  l: 0.04,
  m: 0.024,
  n: 0.067,
  o: 0.075,
  p: 0.019,
  q: 0.001,
  r: 0.06,
  s: 0.063,
  t: 0.091,
  u: 0.028,
  v: 0.01,
  w: 0.024,
  x: 0.015,
  y: 0.02,
  z: 0.008,
}

export const generateRandomString = (length: number) => {
  let str: string[] = []
  const charThresholds: { letter: string; threshold: number }[] = []
  let total = 0
  for (let [letter, prob] of Object.entries(charFrequency)) {
    total += prob
    charThresholds.push({ letter, threshold: total })
  }
  const thresholds = _.sortBy(charThresholds, 'threshold')

  while (str.length < length) {
    const wordLength = _.random(7)
    let seed: number
    for (let i = 0; i < wordLength; i++) {
      seed = Math.random()
      const letter = thresholds.find((char) => char.threshold > seed)!.letter
      str.push(letter)
    }
    str.push(' ')
  }
  return str.join('')
}
