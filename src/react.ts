import { useContext } from 'react'
import invariant from 'tiny-invariant'

export function useInvariantContext<T>(
  ctx: React.Context<T>,
  invariantMessage?: string,
) {
  const context = useContext(ctx)
  invariant(context, invariantMessage)
  return context
}
