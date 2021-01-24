import { Bone, AbstractMesh, Scene, DynamicTexture, StandardMaterial, MeshBuilder, Mesh, Vector3, Texture, Engine, Color3, Matrix, VertexBuffer, Scalar } from '@babylonjs/core'

export class OverlayController {
  constructor(private scene: Scene) {

  }

  showInteractions(text: string, options: Array<[string, () => void]>, bone: Bone, hero: AbstractMesh, vanish: boolean): Array<Mesh> {
    return [
      this.text(text, bone, hero, false, 1),
      ...options.map((x, i) => {
        return this.text(x[0], bone, hero, false, i + 2, x[1]);
      })
    ];
  }

  text(text: string, bone: Bone, hero: AbstractMesh, vanish: boolean = false, position?: number, callback?: () => void): Mesh {
    var font_size = 48
    var font = 'normal ' + font_size + 'px Arial'
    
    var planeHeight = .25
    var DTHeight = 1.5 * font_size
    var ratio = planeHeight / DTHeight

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

    if (vanish || position) {
      dynamicTexture.getContext().fillStyle = '#ffffff'
      this.canvasRoundRect(dynamicTexture.getContext(), 0, 0, DTWidth, DTHeight, 32)
    }

    dynamicTexture.drawText(text, null, null, font, (position || 0) > 1 ? '#B767D2' : vanish || position ? '#000000' : '#ffffff', null as any)
    var mat = new StandardMaterial('mat', this.scene)
    
    if (vanish || position) {
      mat.emissiveTexture = dynamicTexture
    } else {
      mat.emissiveColor = Color3.White()
    }

    mat.opacityTexture = dynamicTexture
    mat.disableLighting = true
    mat.backFaceCulling = false//!!position

    //Create plane and set dynamic texture as material
    var plane = MeshBuilder.CreatePlane('talk', { width: planeWidth, height: planeHeight, updatable: true }, this.scene)
    plane.material = mat

    if (position) {
      const p = plane.getVerticesData(VertexBuffer.PositionKind)!
      plane.geometry!.updateVerticesData(VertexBuffer.PositionKind, p.map((value: number, index: number) => index % 3 === 0 ? value + (planeWidth / 2) : value))
    }

    plane.rotation.x = Math.PI
    plane.billboardMode = Mesh.BILLBOARDMODE_ALL

    if (position) {
      plane.position.addInPlace(new Vector3(-.75, position * planeHeight * 1.25, 0))

      plane.onBeforeBindObservable.add(() => {
        let angle = plane.absolutePosition.subtract(this.scene.activeCamera!.globalPosition).normalize()

        plane.visibility = Math.min(1, Math.max(0.01, Math.pow(Math.max(0, 1 - angle.z - .75), 4)))
      })
    } else if (vanish) {
      setTimeout(() => {
        plane.dispose(false, true)
      }, 5000)
      plane.position.addInPlace(new Vector3(0, -.667, 0))
    } else {
      plane.position.addInPlace(new Vector3(0, -1, 0))
    }

    plane.attachToBone(bone, hero)

    plane.metadata = { callback }

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