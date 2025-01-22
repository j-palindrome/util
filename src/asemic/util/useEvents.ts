import { useContext, useEffect, useRef } from 'react'
import SceneBuilder, { Constant, Ref, Uniform } from '../Builder'
import { useThree } from '@react-three/fiber'
import { AsemicContext } from '../Asemic'
import { Vector2 } from 'three'

export function useEvents(settings?: Partial<SceneBuilder['sceneSettings']>) {
  const renderer = useThree(state => state.gl)
  const { audio } = useContext(AsemicContext)
  const constants: SceneBuilder['constants'] = {}
  const uniforms: SceneBuilder['uniforms'] = {}
  const refs: SceneBuilder['refs'] = {}
  const resolution = new Vector2()
  renderer.getDrawingBufferSize(resolution)
  const height = resolution.y / resolution.x

  if (settings) {
    if (settings) {
      if (settings.constants) {
        for (let constant of Object.keys(settings.constants)) {
          constants[constant] = new Constant(settings.constants[constant][0])
        }
      }
      if (settings.refs && audio) {
        for (let constant of Object.keys(settings.refs)) {
          refs[constant] = new Ref(settings.refs[constant][0], audio.elCore)
        }
      }
      if (settings.uniforms) {
        for (let constant of Object.keys(settings.uniforms)) {
          uniforms[constant] = new Uniform(settings.uniforms[constant][0])
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
      object: SceneBuilder['sceneSettings'][T],
      constants: SceneBuilder[T]
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

              constants[key].update(events.onDrag!(coord))
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

              constants[key].update(events.onMove!(coord))
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
      if (settings) {
        if (settings.constants) {
          updateEvents(settings.constants, constants)
        }
        if (settings.refs) {
          updateEvents(settings.refs, refs)
        }
        if (settings.uniforms) {
          updateEvents(settings.uniforms, uniforms)
        }
      }
    }
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

  return { constants, uniforms, refs }
}
