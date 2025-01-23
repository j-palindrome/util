import { useContext, useEffect, useRef } from 'react'
import SceneBuilder from '../Builder'
import { useThree } from '@react-three/fiber'
import { AsemicContext } from '../Asemic'
import { Vector2 } from 'three'
import { uniform } from 'three/tsl'
import { ElemNode } from '@elemaudio/core'
import WebAudioRenderer from '@elemaudio/web-renderer'

abstract class Control<T, K> {
  abstract value: T
  abstract update(newValue: K): void
}
export class Constant<T> extends Control<T, T> {
  value: T

  update(newValue: T) {
    this.value = newValue
  }
  constructor(value: T) {
    super()
    this.value = value
  }
}

export class Uniform<T extends number> extends Control<
  ReturnType<typeof uniform>,
  T
> {
  value: ReturnType<typeof uniform>
  update(newValue: T) {
    this.value.value = newValue
    this.value.needsUpdate = true
  }
  constructor(value: T) {
    super()
    this.value = uniform(value)
  }
}

export class Ref<T extends number> extends Control<ElemNode, T> {
  value: ElemNode
  updateValue: (newProps: { value: T }) => Promise<T>
  update(newValue: T) {
    this.updateValue({ value: newValue })
  }
  constructor(value: T, core: WebAudioRenderer) {
    super()
    const ref = core.createRef('const', { value }, [])
    this.value = ref[0] as unknown as ElemNode
    this.updateValue = ref[1] as ({ value }: { value: T }) => Promise<T>
  }
}

export type Events<K> = {
  onClick?: (coords: [number, number]) => K
  onMove?: (coords: [number, number]) => K
  onDrag?: (coords: [number, number]) => K
  onKeyDown?: (key: string) => K
  onKeyUp?: (key: string) => K
  onType?: (keys: string) => K
}
export type SettingsInput = {
  constants: Record<string, [value: any, events: Events<any>]>
  uniforms: Record<string, [value: number, events: Events<number>]>
  refs: Record<string, [value: number, events: Events<number>]>
}
export type Settings<T extends SettingsInput> = {
  constants: { [K in keyof T['constants']]: Constant<T['constants'][K][0]> }
  uniforms: { [K in keyof T['uniforms']]: Uniform<T['uniforms'][K][0]> }
  refs: { [K in keyof T['refs']]: Ref<T['refs'][K][0]> }
}

function createTypes<T extends SettingsInput>(
  input: T,
  core: WebAudioRenderer
): Settings<T> {
  const settings: Settings<T> = {
    constants: {},
    uniforms: {},
    refs: {}
  } as any
  for (let [key, [value, events]] of Object.entries(input.constants)) {
    // @ts-ignore
    settings.constants[key] = new Constant(value)
  }
  for (let [key, [value, events]] of Object.entries(input.uniforms)) {
    // @ts-ignore
    settings.uniforms[key] = new Uniform(value)
  }
  for (let [key, [value, events]] of Object.entries(input.constants)) {
    // @ts-ignore
    settings.refs[key] = new Ref(value, core)
  }
  return settings
}

export function useEvents<T extends SettingsInput>(
  controlsInput: T,
  settings?: Partial<SceneBuilder<any>['sceneSettings']>
): Settings<T> {
  const renderer = useThree(state => state.gl)
  const { audio } = useContext(AsemicContext)
  const resolution = new Vector2()
  renderer.getDrawingBufferSize(resolution)
  const height = resolution.y / resolution.x
  const controls = createTypes(controlsInput, audio!.elCore)

  type EventProps<T extends keyof WindowEventMap> = {
    type: T
    listener: (this: Window, ev: WindowEventMap[T]) => void
  }
  let dragging = useRef(false)
  let text = useRef('')
  useEffect(() => {
    const drag = () => {
      dragging.current = true
    }
    window.addEventListener('mousedown', drag)
    const dragOff = () => {
      dragging.current = false
    }
    window.addEventListener('mouseup', dragOff)
    const listeners: EventProps<any>[] = []
    const updateEvents = <T extends 'constants' | 'refs' | 'uniforms'>(
      object: SettingsInput[T]
    ) => {
      for (let [key, [_value, events]] of Object.entries(object)) {
        if (events.onClick) {
          const clickEvent: EventProps<'click'> = {
            type: 'click',
            listener: (ev: MouseEvent) => {
              controls[key].update(
                events.onClick!([
                  (ev.clientX - renderer.domElement.clientLeft) /
                    renderer.domElement.clientWidth,
                  1 -
                    ((ev.clientY - renderer.domElement.clientTop) /
                      renderer.domElement.clientHeight) *
                      height
                ])
              )
            }
          }
          listeners.push(clickEvent)
        }
        if (events.onDrag) {
          const clickEvent: EventProps<'mousemove'> = {
            type: 'mousemove',
            listener: (ev: MouseEvent) => {
              if (!dragging.current) return
              const coord: [number, number] = [
                (ev.clientX - renderer.domElement.clientLeft) /
                  renderer.domElement.clientWidth,
                1 -
                  ((ev.clientY - renderer.domElement.clientTop) /
                    renderer.domElement.clientHeight) *
                    height
              ]

              controls[key].update(events.onDrag!(coord))
            }
          }
          listeners.push(clickEvent)
        }
        if (events.onMove) {
          const clickEvent: EventProps<'mousemove'> = {
            type: 'mousemove',
            listener: (ev: MouseEvent) => {
              if (dragging.current) return
              const coord: [number, number] = [
                (ev.clientX - renderer.domElement.clientLeft) /
                  renderer.domElement.clientWidth,
                height -
                  ((ev.clientY - renderer.domElement.clientTop) /
                    renderer.domElement.clientHeight) *
                    height
              ]

              controls[key].update(events.onMove!(coord))
            }
          }
          listeners.push(clickEvent)
        }
        if (events.onKeyDown) {
          const clickEvent: EventProps<'keydown'> = {
            type: 'keydown',
            listener: ev => {
              controls[key].update(events.onKeyDown!(ev.key))
            }
          }
          listeners.push(clickEvent)
        }
        if (events.onKeyUp) {
          const clickEvent: EventProps<'keyup'> = {
            type: 'keyup',
            listener: ev => {
              controls[key].update(events.onKeyUp!(ev.key))
            }
          }
          listeners.push(clickEvent)
        }
        if (events.onType) {
          const clickEvent: EventProps<'keydown'> = {
            type: 'keydown',
            listener: ev => {
              if (ev.key === 'Backspace') {
                if (ev.metaKey) {
                  text.current = ''
                } else {
                  text.current = text.current.slice(0, -1)
                }
              }
              controls[key].update(events.onType!(ev.key))
            }
          }
          listeners.push(clickEvent)
        }
      }
    }
    updateEvents(controlsInput.constants)
    updateEvents(controlsInput.refs)
    updateEvents(controlsInput.uniforms)

    listeners.forEach(listener =>
      window.addEventListener(listener.type, listener.listener)
    )

    return () => {
      window.removeEventListener('mouseup', dragOff)
      window.removeEventListener('mousedown', drag)
      listeners.forEach(listener =>
        window.removeEventListener(listener.type, listener.listener)
      )
    }
  }, [settings])

  return controls
}
