import { produce } from 'immer'
import { useRef } from 'react'
import io from 'socket.io-client'
import { createWithEqualityFn } from 'zustand/traditional'

export type AppState = {}

export const useAppStore = createWithEqualityFn<AppState>(() => ({}))

export const useAppStoreRef = <T>(callback: (state: AppState) => T) => {
  const storeValue: T = useAppStore(callback)
  const storeValueRef = useRef(storeValue)
  storeValueRef.current = storeValue
  return [storeValue, storeValueRef] as [
    typeof storeValue,
    typeof storeValueRef
  ]
}

const modify = (modifier: (state: AppState) => void) =>
  useAppStore.setState(produce(modifier))

export const setters = {
  set: (newState: Partial<AppState>) => modify(() => newState)
}

export const getters = {
  get: <T extends keyof AppState>(key: T) => useAppStore.getState()[key]
}
