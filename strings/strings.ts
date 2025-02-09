export function randomString(count: number) {
  let string = ''
  const letters = 'abcdefghijklmnopqrstuvwxyz'
  const punctuation = '".,?!/:;()&-'
  const space = ' '
  for (let i = 0; i < count; i++) {
    const random = Math.random()
    if (random < 1 || i === 0) {
      string += letters[Math.floor(Math.random() * letters.length)]
    } else {
      string += space
    }
  }
  return string
}
