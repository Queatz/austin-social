import { AbstractMesh, Color3, Mesh, Scene, StandardMaterial, Texture, Vector2 } from '@babylonjs/core'
import { WaterMaterial } from '@babylonjs/materials'

export class WaterController {
  waterMaterial: WaterMaterial
  waterMesh: Mesh
  groundMesh: Mesh

  constructor(private scene: Scene) {
    const groundTexture = new Texture('assets/sand.jpg', scene)
    groundTexture.vScale = groundTexture.uScale = 10.0

    const groundMaterial = new StandardMaterial('groundMaterial', scene)
    groundMaterial.specularColor = Color3.Black()
    groundMaterial.diffuseTexture = groundTexture

    this.groundMesh = Mesh.CreateGround('ground', 1024, 1024, 32, scene, false)
    this.groundMesh.position.y = -4
    this.groundMesh.material = groundMaterial
    this.groundMesh.receiveShadows = true

    this.waterMesh = Mesh.CreateGround('waterMesh', 1024, 1024, 64, scene, false)

    this.waterMaterial = new WaterMaterial('water', scene, new Vector2(512, 512))
    this.waterMaterial.backFaceCulling = true
    const waterBump = new Texture('assets/waterbump.png', scene)
    waterBump.uScale = waterBump.vScale = 6
    this.waterMaterial.bumpTexture = waterBump
    this.waterMaterial.windForce = -1.4
    this.waterMaterial.waveHeight = .02
    this.waterMaterial.bumpHeight = .7
    this.waterMaterial.waveLength = .1
    this.waterMaterial.waveSpeed = 50
    this.waterMaterial.bumpSuperimpose = true
    this.waterMaterial.waterColor = Color3.FromHexString('#2D7493')
    this.waterMaterial.colorBlendFactor = .3
    this.waterMaterial.colorBlendFactor2 = .9
    this.waterMaterial.addToRenderList(this.groundMesh)
    this.waterMaterial.alpha = .94
    this.waterMaterial.specularColor = Color3.White()
    this.waterMaterial.specularPower = 256
    this.waterMaterial.bumpAffectsReflection = true
    this.waterMaterial.backFaceCulling = false
    this.waterMesh.material = this.waterMaterial
    this.waterMesh.alphaIndex = 0
  }

  setWaterColor(color: Color3) {
    this.waterMaterial.waterColor = color
  }
  
  addToRenderList(mesh: AbstractMesh) {
    this.waterMaterial.addToRenderList(mesh)
  }
}