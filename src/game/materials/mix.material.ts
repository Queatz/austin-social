import { NodeMaterial, InputBlock, TransformBlock, NodeMaterialSystemValues, LightBlock, MultiplyBlock, Texture, TextureBlock, ColorMergerBlock, AddBlock, FragmentOutputBlock, VertexOutputBlock, Color3, FogBlock } from '@babylonjs/core'

export const getMixMaterial = (mixTexture: Texture, textureRed?: Texture, textureGreen?: Texture, textureBlue?: Texture): NodeMaterial => {
  const nodeMaterial = new NodeMaterial('node')

  // InputBlock
  const position = new InputBlock('position')
  position.setAsAttribute('position')

  // TransformBlock
  const worldPos = new TransformBlock('worldPos')
  worldPos.complementZ = 0
  worldPos.complementW = 1

  // InputBlock
  const world = new InputBlock('world')
  world.setAsSystemValue(NodeMaterialSystemValues.World)

  // TransformBlock
  const worldnormal = new TransformBlock('world normal')
  worldnormal.complementZ = 0
  worldnormal.complementW = 0

  // InputBlock
  const normal = new InputBlock('normal')
  normal.setAsAttribute('normal')

  // LightBlock
  const Lights = new LightBlock('Lights')
  Lights.visibleInInspector = false
  Lights.visibleOnFrame = false

  // InputBlock
  const cameraPosition = new InputBlock('cameraPosition')
  cameraPosition.setAsSystemValue(NodeMaterialSystemValues.CameraPosition)

  // InputBlock
  const View = new InputBlock('View')
  View.setAsSystemValue(NodeMaterialSystemValues.View)

  // MultiplyBlock
  const Multiply = new MultiplyBlock('Multiply')
  Multiply.visibleInInspector = false
  Multiply.visibleOnFrame = false

  // TextureBlock
  const Texture0 = new TextureBlock('Texture 1')
  Texture0.texture = textureRed!
  Texture0.texture.wrapV = Texture.WRAP_ADDRESSMODE
  Texture0.texture.wrapU = Texture.WRAP_ADDRESSMODE
  Texture0.texture.coordinatesMode = Texture.EQUIRECTANGULAR_MODE
  Texture0.convertToGammaSpace = false
  Texture0.convertToLinearSpace = true

  // InputBlock
  const uv = new InputBlock('uv')
  uv.setAsAttribute('uv')

  // TextureBlock
  const MixMap = new TextureBlock('MixMap')
  MixMap.texture = mixTexture
  MixMap.texture.coordinatesMode = Texture.CLAMP_ADDRESSMODE
  MixMap.convertToGammaSpace = false
  MixMap.convertToLinearSpace = false

  // ColorMergerBlock
  const ColorMerger = new ColorMergerBlock('ColorMerger')
  ColorMerger.visibleInInspector = false
  ColorMerger.visibleOnFrame = false

  // MultiplyBlock
  const Multiply1 = new MultiplyBlock('Multiply')
  Multiply1.visibleInInspector = false
  Multiply1.visibleOnFrame = false

  // AddBlock
  const Add = new AddBlock('Add')
  Add.visibleInInspector = false
  Add.visibleOnFrame = false

  // MultiplyBlock
  const Multiply2 = new MultiplyBlock('Multiply')
  Multiply2.visibleInInspector = false
  Multiply2.visibleOnFrame = false

  // MultiplyBlock
  const Multiply3 = new MultiplyBlock('Multiply')
  Multiply3.visibleInInspector = false
  Multiply3.visibleOnFrame = false

  // TextureBlock
  const Texture1 = new TextureBlock('Texture 2')
  Texture1.texture = textureGreen!
  Texture1.texture.wrapV = Texture.WRAP_ADDRESSMODE
  Texture1.texture.wrapU = Texture.WRAP_ADDRESSMODE
  Texture1.texture.coordinatesMode = Texture.EQUIRECTANGULAR_MODE
  Texture1.convertToGammaSpace = false
  Texture1.convertToLinearSpace = true

  // ColorMergerBlock
  const ColorMerger1 = new ColorMergerBlock('ColorMerger')
  ColorMerger1.visibleInInspector = false
  ColorMerger1.visibleOnFrame = false

  // AddBlock
  const Add1 = new AddBlock('Add')
  Add1.visibleInInspector = false
  Add1.visibleOnFrame = false

  // MultiplyBlock
  const Multiply4 = new MultiplyBlock('Multiply')
  Multiply4.visibleInInspector = false
  Multiply4.visibleOnFrame = false

  // MultiplyBlock
  const Multiply5 = new MultiplyBlock('Multiply')
  Multiply5.visibleInInspector = false
  Multiply5.visibleOnFrame = false

  // TextureBlock
  const Texture2 = textureBlue ? new TextureBlock('Texture 3') : null

  if (textureBlue) {
    Texture2!.texture = textureBlue
    Texture2!.texture.wrapV = Texture.WRAP_ADDRESSMODE
    Texture2!.texture.wrapU = Texture.WRAP_ADDRESSMODE
    Texture2!.texture.coordinatesMode = Texture.EQUIRECTANGULAR_MODE
    Texture2!.convertToGammaSpace = false
    Texture2!.convertToLinearSpace = true
  }

  // ColorMergerBlock
  const ColorMerger2 = new ColorMergerBlock('ColorMerger')
  ColorMerger2.visibleInInspector = false
  ColorMerger2.visibleOnFrame = false

  // FragmentOutputBlock
  const fragmentOutput = new FragmentOutputBlock('fragmentOutput')
  fragmentOutput.convertToGammaSpace = false
  fragmentOutput.convertToLinearSpace = false

  // TransformBlock
  const worldPosviewProjectionTransform = new TransformBlock('worldPos * viewProjectionTransform')
  worldPosviewProjectionTransform.complementZ = 0
  worldPosviewProjectionTransform.complementW = 1

  // InputBlock
  const viewProjection = new InputBlock('viewProjection')
  viewProjection.setAsSystemValue(NodeMaterialSystemValues.ViewProjection)

  // VertexOutputBlock
  const vertexOutput = new VertexOutputBlock('vertexOutput')
  vertexOutput.visibleInInspector = false
  vertexOutput.visibleOnFrame = false

  
  // FogBlock
  var Fog = new FogBlock('Fog')
  Fog.visibleInInspector = false
  Fog.visibleOnFrame = false


  // InputBlock
  var Fogcolor = new InputBlock('Fog color');
  Fogcolor.setAsSystemValue(NodeMaterialSystemValues.FogColor);
  worldPos.output.connectTo(Fog.worldPosition);

  // Connections
  position.output.connectTo(worldPos.vector)
  world.output.connectTo(worldPos.transform)
  worldPos.output.connectTo(worldPosviewProjectionTransform.vector)
  viewProjection.output.connectTo(worldPosviewProjectionTransform.transform)
  worldPosviewProjectionTransform.output.connectTo(vertexOutput.vector)
  worldPos.output.connectTo(Lights.worldPosition)
  normal.output.connectTo(worldnormal.vector)
  world.output.connectTo(worldnormal.transform)
  worldnormal.output.connectTo(Lights.worldNormal)
  cameraPosition.output.connectTo(Lights.cameraPosition)
  View.output.connectTo(Lights.view)
  Lights.diffuseOutput.connectTo(Multiply.left)
  uv.output.connectTo(Texture0.uv)
  Texture0.rgb.connectTo(Multiply.right)
  Multiply.output.connectTo(Multiply1.left)
  uv.output.connectTo(MixMap.uv)
  MixMap.r.connectTo(ColorMerger.r)
  MixMap.r.connectTo(ColorMerger.g)
  MixMap.r.connectTo(ColorMerger.b)
  ColorMerger.rgb.connectTo(Multiply1.right)
  Multiply1.output.connectTo(Add.left)
  Lights.diffuseOutput.connectTo(Multiply3.left)
  uv.output.connectTo(Texture1.uv)
  Texture1.rgb.connectTo(Multiply3.right)
  Multiply3.output.connectTo(Multiply2.left)
  MixMap.g.connectTo(ColorMerger1.r)
  MixMap.g.connectTo(ColorMerger1.g)
  MixMap.g.connectTo(ColorMerger1.b)
  ColorMerger1.rgb.connectTo(Multiply2.right)
  Multiply2.output.connectTo(Add.right)
  Add.output.connectTo(Add1.left)
  Lights.diffuseOutput.connectTo(Multiply5.left)

  if (Texture2) {
    uv.output.connectTo(Texture2.uv)
    Texture2.rgb.connectTo(Multiply5.right)
  } else {
    const Color = new InputBlock('value')
    Color.value = Color3.Black()
    Color.isConstant = false

    Color.output.connectTo(Multiply5.right)
  }

  Multiply5.output.connectTo(Multiply4.left)
  MixMap.b.connectTo(ColorMerger2.r)
  MixMap.b.connectTo(ColorMerger2.g)
  MixMap.b.connectTo(ColorMerger2.b)
  ColorMerger2.rgb.connectTo(Multiply4.right)
  Multiply4.output.connectTo(Add1.right)
  View.output.connectTo(Fog.view)
  Add1.output.connectTo(Fog.input)
  Fogcolor.output.connectTo(Fog.fogColor)
  Fog.output.connectTo(fragmentOutput.rgb)

  // Output nodes
  nodeMaterial.addOutputNode(vertexOutput)
  nodeMaterial.addOutputNode(fragmentOutput)

  nodeMaterial.build()

  return nodeMaterial
}