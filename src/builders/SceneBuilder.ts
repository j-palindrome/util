import { el as elementary, ElemNode } from '@elemaudio/core'
import WebAudioRenderer from '@elemaudio/web-renderer'
import { Vector2 } from 'three'
import { pass, ShaderNodeObject, texture } from 'three/tsl'
import { PostProcessing, TextureNode } from 'three/webgpu'
import { Settings, SettingsInput } from '../util/useEvents'
import Builder from './Builder'

type BuilderGlobals = Pick<
  SceneBuilder<any>,
  'postProcessing' | 'audio' | 'h' | 'size'
>

export default class SceneBuilder<T extends SettingsInput> extends Builder {
  // groups: GroupBuilder<any>[] = []
  mouse = new Vector2()
  click = new Vector2()
  text = ''
  keys: string[] = []
  postProcessing: {
    postProcessing: PostProcessing
    scenePass: ReturnType<typeof pass>
    readback: ReturnType<typeof texture> | null
  }
  audio: {
    ctx: AudioContext
    elNode: AudioWorkletNode
    elCore: WebAudioRenderer
  } | null
  size: Vector2
  constants: Settings<T>['constants']
  refs: Settings<T>['refs']
  uniforms: Settings<T>['uniforms']
  h: number

  sceneSettings: {
    postProcessing: (
      input: ShaderNodeObject<TextureNode>,
      info: {
        scenePass: BuilderGlobals['postProcessing']['scenePass']
        readback: BuilderGlobals['postProcessing']['readback']
      },
    ) => ShaderNodeObject<any>
    audio: ((el: typeof elementary) => ElemNode | [ElemNode, ElemNode]) | null
    useReadback: boolean
  } = {
    postProcessing: (input) => input,
    useReadback: false,
    audio: null,
  }

  constructor(
    sceneSettings: Partial<SceneBuilder<T>['sceneSettings']>,
    globals: BuilderGlobals,
    controls: Settings<T>,
  ) {
    super()
    Object.assign(this.sceneSettings, sceneSettings)
    this.constants = controls.constants
    this.refs = controls.refs
    this.uniforms = controls.uniforms
    this.audio = globals.audio
    this.postProcessing = globals.postProcessing
    this.size = globals.size
    this.h = globals.h
  }
}
