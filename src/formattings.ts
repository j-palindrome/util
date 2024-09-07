export const create = <T>(e: T, onCreate: (argument: T) => void) => {
  onCreate(e)
  return e
}
