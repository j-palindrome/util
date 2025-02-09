import {
  RenderTarget,
  Vector2,
  QuadMesh,
  NodeMaterial,
  RendererUtils,
  TempNode,
  NodeUpdateType,
  NodeFrame,
  NodeBuilder,
  UniformNode
} from 'three/webgpu'
import {
  nodeObject,
  Fn,
  float,
  vec4,
  uv,
  texture,
  passTexture,
  uniform,
  sign,
  max,
  convertToTexture,
  ShaderNodeObject
} from 'three/tsl'

const _size = new Vector2()

type PassTextureNode = any
type TextureNode = any
type vec2 = any
type vec4 = any
type float = any

/**
 * Post processing node for creating an after image effect.
 *
 * @augments TempNode
 */
class AfterImageNode extends TempNode {
  private _quadMeshComp: QuadMesh = new QuadMesh()
  private _compRT: RenderTarget
  private _oldRT: RenderTarget
  private _textureNode: PassTextureNode
  private _rendererState: any
  private textureNodeOld: TextureNode
  public damp: ShaderNodeObject<UniformNode<number>>
  _materialComposed = new NodeMaterial()

  static get type() {
    return 'AfterImageNode'
  }

  /**
   * Constructs a new after image node.
   *
   * @param {TextureNode} textureNode - The texture node that represents the input of the effect.
   * @param {number} [damp=0.96] - The damping intensity. A higher value means a stronger after image effect.
   */
  constructor(
    public textureNode: TextureNode,
    damp: number = 0.96
  ) {
    super('vec4')

    /**
     * The texture represents the previous frame.
     *
     * @type {TextureNode}
     */
    this.textureNodeOld = texture(undefined as any)

    /**
     * The damping intensity as a uniform node.
     *
     * @type {UniformNode<float>}
     */
    this.damp = uniform(damp)

    /**
     * The render target used for compositing the effect.
     *
     * @private
     * @type {RenderTarget}
     */
    this._compRT = new RenderTarget(1, 1, { depthBuffer: false })
    this._compRT.texture.name = 'AfterImageNode.comp'

    /**
     * The render target that represents the previous frame.
     *
     * @private
     * @type {RenderTarget}
     */
    this._oldRT = new RenderTarget(1, 1, { depthBuffer: false })
    this._oldRT.texture.name = 'AfterImageNode.old'

    /**
     * The result of the effect is represented as a separate texture node.
     *
     * @private
     * @type {PassTextureNode}
     */
    this._textureNode = passTexture(this as any, this._compRT.texture)

    /**
     * The `updateBeforeType` is set to `NodeUpdateType.FRAME` since the node renders
     * its effect once per frame in `updateBefore()`.
     *
     * @type {string}
     * @default 'frame'
     */
    this.updateBeforeType = NodeUpdateType.FRAME
  }

  /**
   * Returns the result of the effect as a texture node.
   *
   * @return {PassTextureNode} A texture node that represents the result of the effect.
   */
  getTextureNode(): PassTextureNode {
    return this._textureNode
  }

  /**
   * Sets the size of the effect.
   *
   * @param {number} width - The width of the effect.
   * @param {number} height - The height of the effect.
   */
  setSize(width: number, height: number): void {
    this._compRT.setSize(width, height)
    this._oldRT.setSize(width, height)
  }

  /**
   * This method is used to render the effect once per frame.
   *
   * @param {NodeFrame} frame - The current node frame.
   */
  updateBefore(frame: NodeFrame): void {
    const renderer = frame.renderer!

    this._rendererState = RendererUtils.resetRendererState(
      renderer,
      this._rendererState
    )

    const textureNode = this.textureNode
    const map = textureNode.value

    const textureType = map.type

    this._compRT.texture.type = textureType
    this._oldRT.texture.type = textureType

    renderer.getDrawingBufferSize(_size)

    this.setSize(_size.x, _size.y)

    const currentTexture = textureNode.value

    this.textureNodeOld.value = this._oldRT.texture

    // comp

    renderer.setRenderTarget(this._compRT)
    this._quadMeshComp.render(renderer)

    // Swap the textures

    const temp = this._oldRT
    this._oldRT = this._compRT
    this._compRT = temp

    textureNode.value = currentTexture

    RendererUtils.restoreRendererState(renderer, this._rendererState)
  }

  /**
   * This method is used to setup the effect's TSL code.
   *
   * @param {NodeBuilder} builder - The current node builder.
   * @return {PassTextureNode}
   */
  setup(builder: NodeBuilder): PassTextureNode {
    const textureNode = this.textureNode
    const textureNodeOld = this.textureNodeOld

    const uvNode = textureNode.uvNode || uv()

    textureNodeOld.uvNode = uvNode

    const sampleTexture = (uv: vec2) => textureNode.sample(uv)

    const afterImg = Fn(() => {
      const texelOld = vec4(textureNodeOld)
      const texelNew = vec4(sampleTexture(uvNode))

      texelOld.mulAssign(this.damp)
      return max(texelNew, texelOld)
    })

    const materialComposed = this._materialComposed
    materialComposed.name = 'AfterImage'
    materialComposed.fragmentNode = afterImg()

    this._quadMeshComp.material = materialComposed

    const properties = builder.getNodeProperties(this)
    properties.textureNode = textureNode

    return this._textureNode
  }

  /**
   * Frees internal resources. This method should be called
   * when the effect is no longer required.
   */
  dispose(): void {
    this._compRT.dispose()
    this._oldRT.dispose()
  }
}

/**
 * TSL function for creating an after image node for post processing.
 *
 * @function
 * @param {Node<vec4>} node - The node that represents the input of the effect.
 * @param {number} [damp=0.96] - The damping intensity. A higher value means a stronger after image effect.
 * @returns {AfterImageNode}
 */
export const afterImage = (node: any, damp?: number): AfterImageNode =>
  nodeObject(new AfterImageNode(convertToTexture(node), damp))

export default AfterImageNode
