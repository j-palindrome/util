export const sanitize = (str: object) =>
  Object.fromEntries(
    Object.entries(str).map((x) => [
      x[0],
      x[1].replace(/[\u200B-\u200D\uFEFF]/g, ''),
    ]),
  )
