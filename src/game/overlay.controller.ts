import { Bone, AbstractMesh, Scene, DynamicTexture, StandardMaterial, MeshBuilder, Mesh, Vector3, Texture, Engine, Color3 } from '@babylonjs/core'

export class OverlayController {
  constructor(private scene: Scene) {

  }

  text(text: string, bone: Bone, hero: AbstractMesh, vanish: boolean): Mesh {
    var font_size = 48
    var font = 'normal ' + font_size + 'px Arial'
    
    var planeHeight = .25
    var DTHeight = 1.5 * font_size
    var ratio = planeHeight/DTHeight

    var temp = new DynamicTexture('DynamicTexture', 64, this.scene, false)
    var tmpctx = temp.getContext()
    tmpctx.font = font
    var DTWidth = tmpctx.measureText(text).width + 32
    temp.dispose()

    var planeWidth = DTWidth * ratio

    var dynamicTexture = new DynamicTexture('DynamicTexture',
      { width: DTWidth, height: DTHeight },
      this.scene,
      false,
      Texture.LINEAR_LINEAR,
      Engine.TEXTUREFORMAT_ALPHA
    )

    if (vanish) {
      dynamicTexture.getContext().fillStyle = '#ffffff'
      this.canvasRoundRect(dynamicTexture.getContext(), 0, 0, DTWidth, DTHeight, 32)
    }

    dynamicTexture.drawText(text, null, null, font, vanish ? '#000000' : '#ffffff', null as any)
    var mat = new StandardMaterial('mat', this.scene)
    
    if (vanish) {
      mat.emissiveTexture = dynamicTexture
    } else {
      mat.emissiveColor = Color3.White()
    }

    mat.opacityTexture = dynamicTexture
    mat.disableLighting = true
    mat.backFaceCulling = false

    //Create plane and set dynamic texture as material
    var plane = MeshBuilder.CreatePlane('plane', { width: planeWidth, height: planeHeight }, this.scene)
    plane.material = mat
    plane.billboardMode = Mesh.BILLBOARDMODE_ALL

    plane.rotation.x = Math.PI

    if (vanish) {
      setTimeout(() => {
        plane.dispose(false, true)
      }, 5000)
      plane.position.addInPlace(new Vector3(0, -.667, 0))
    } else {
      plane.position.addInPlace(new Vector3(0, -1, 0))
    }
    plane.attachToBone(bone, hero)

    return plane
  }

  private canvasRoundRect(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number) {
    var r = x + w
    var b = y + h
    context.beginPath()
    context.moveTo(x + radius, y)
    context.lineTo(r - radius, y)
    context.quadraticCurveTo(r, y, r, y + radius)
    context.lineTo(r, y + h - radius)
    context.quadraticCurveTo(r, b, r - radius, b)
    context.lineTo(x + radius, b)
    context.quadraticCurveTo(x, b, x, b - radius)
    context.lineTo(x, y + radius)
    context.quadraticCurveTo(x, y, x + radius, y)
    context.fill()
  }
}