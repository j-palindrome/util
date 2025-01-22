import { useContext, useEffect, useRef } from 'react'
import SceneBuilder, { Constant, Ref, Uniform } from '../Builder'
import { useThree } from '@react-three/fiber'
import { AsemicContext } from '../Asemic'

export function useEvents(settings?: Partial<SceneBuilder['sceneSettings']>) {
  const renderer = useThree(state => state.gl)
  const { audio } = useContext(AsemicContext)
  const constants: SceneBuilder['controls']['constants'] = {}
  const uniforms: SceneBuilder['controls']['uniforms'] = {}
  const refs: SceneBuilder['controls']['refs'] = {}
  if (settings) {
    if (settings.controls) {
      if (settings.controls.constants) {
        for (let constant of Object.keys(settings.controls.constants)) {
          constants[constant] = new Constant(
            settings.controls.constants[constant][0]
          )
        }
      }
      if (settings.controls.refs && audio) {
        for (let constant of Object.keys(settings.controls.refs)) {
          refs[constant] = new Ref(
            settings.controls.refs[constant][0],
            audio.elCore
          )
        }
      }
      if (settings.controls.uniforms) {
        for (let constant of Object.keys(settings.controls.uniforms)) {
          uniforms[constant] = new Uniform(
            settings.controls.uniforms[constant][0]
          )
        }
      }
    }
  }

  type EventProps<T extends keyof WindowEventMap> = {
    type: T
    listener: (this: Window, ev: WindowEventMap[T]) => void
  }
  let dragging = useRef(false)
  let text = useRef('')
  useEffect(() => {
    const listeners: EventProps<any>[] = []
    const updateEvents = <T extends 'constants' | 'refs' | 'uniforms'>(
      object: SceneBuilder['sceneSettings']['controls'][T],
      constants: SceneBuilder['controls'][T]
    ) => {
      for (let [key, [_value, events]] of Object.entries(object)) {
        if (events.onClick) {
          const clickEvent: EventProps<'click'> = {
            type: 'click',
            listener: (ev: MouseEvent) => {
              constants[key].update(
                events.onClick!([
                  (ev.clientX - renderer.domElement.clientLeft) /
                    renderer.domElement.clientWidth,
                  1 -
                    (ev.clientY - renderer.domElement.clientTop) /
                      renderer.domElement.clientHeight
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
              if (!dragging) return
              constants[key].update(
                events.onDrag!([
                  (ev.clientX - renderer.domElement.clientLeft) /
                    renderer.domElement.clientWidth,
                  1 -
                    (ev.clientY - renderer.domElement.clientTop) /
                      renderer.domElement.clientHeight
                ])
              )
            }
          }
          listeners.push(clickEvent)
        }
        if (events.onMove) {
          const clickEvent: EventProps<'mousemove'> = {
            type: 'mousemove',
            listener: (ev: MouseEvent) => {
              if (dragging) return
              constants[key].update(
                events.onMove!([
                  (ev.clientX - renderer.domElement.clientLeft) /
                    renderer.domElement.clientWidth,
                  1 -
                    (ev.clientY - renderer.domElement.clientTop) /
                      renderer.domElement.clientHeight
                ])
              )
            }
          }
          listeners.push(clickEvent)
        }
        if (events.onKeyDown) {
          const clickEvent: EventProps<'keydown'> = {
            type: 'keydown',
            listener: ev => {
              constants[key].update(events.onKeyDown!(ev.key))
            }
          }
          listeners.push(clickEvent)
        }
        if (events.onKeyUp) {
          const clickEvent: EventProps<'keyup'> = {
            type: 'keyup',
            listener: ev => {
              constants[key].update(events.onKeyUp!(ev.key))
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
              constants[key].update(events.onType!(ev.key))
            }
          }
          listeners.push(clickEvent)
        }
      }
    }
    if (settings) {
      if (settings.controls) {
        if (settings.controls.constants) {
          updateEvents(settings.controls.constants, constants)
        }
        if (settings.controls.refs) {
          updateEvents(settings.controls.refs, refs)
        }
        if (settings.controls.uniforms) {
          updateEvents(settings.controls.uniforms, uniforms)
        }
      }
    }
    return () => {
      listeners.forEach(listener =>
        window.removeEventListener(listener.type, listener.listener)
      )
    }
  })
  return { constants, uniforms, refs }
}
