import { Bone, AbstractMesh, Scene, DynamicTexture, StandardMaterial, MeshBuilder, Mesh, Vector3 } from '@babylonjs/core'

export class OverlayController {
  constructor(private scene: Scene) {

  }

  text(text: string, bone: Bone, hero: AbstractMesh, vanish: boolean) {
    //Set font
    var font_size = 48
    var font = 'normal ' + font_size + 'px Arial'
    
    //Set height for plane
    var planeHeight = .25

    //Set height for dynamic texture
    var DTHeight = 1.5 * font_size

    //Calcultae ratio
    var ratio = planeHeight/DTHeight

    //Use a temporay dynamic texture to calculate the length of the text on the dynamic texture canvas
    var temp = new DynamicTexture('DynamicTexture', 64, this.scene, false)
    var tmpctx = temp.getContext()
    tmpctx.font = font
    var DTWidth = tmpctx.measureText(text).width + 32
    temp.dispose()

    //Calculate width the plane has to be 
    var planeWidth = DTWidth * ratio

    //Create dynamic texture and write the text
    var dynamicTexture = new DynamicTexture('DynamicTexture', { width: DTWidth, height: DTHeight }, this.scene, false)

    if (vanish) {
      dynamicTexture.getContext().fillStyle = '#ffffff'
      this.canvasRoundRect(dynamicTexture.getContext(), 0, 0, DTWidth, DTHeight, 32)
    }

    dynamicTexture.drawText(text, null, null, font, vanish ? '#000000' : '#ffffff', 'rgba(255, 255, 255, 0.01)') // TODO figure out how to set alpha to 0
    var mat = new StandardMaterial('mat', this.scene)
    mat.emissiveTexture = dynamicTexture
    mat.diffuseTexture = dynamicTexture
    mat.diffuseTexture.hasAlpha = true
    mat.useAlphaFromDiffuseTexture = true
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