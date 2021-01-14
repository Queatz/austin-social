import { InstancedMesh, Material, Mesh, PBRMaterial, Scene, SceneLoader, ShadowGenerator, StandardMaterial, Texture } from '@babylonjs/core'
import { PlantsController } from './plants.controller'

export class WorldController {

  ground?: Mesh
  plants = new PlantsController()

  constructor(scene: Scene, shadowGenerator: ShadowGenerator, worldFileName: string) {
    SceneLoader.ImportMesh('', '/assets/', worldFileName, scene, result => {
      this.ground = scene.getMeshByName('Peninsula') as Mesh

      const groundMaterial = new PBRMaterial('pbr', scene)
      groundMaterial.metallic = 0
      groundMaterial.roughness = .7
      const texture = new Texture('assets/peninsula sand.png', scene)
      texture.uScale = texture.vScale = 120
      groundMaterial.albedoTexture = texture
      groundMaterial.specularIntensity = 0.1

      const grassBump = new Texture('assets/grass_path_2_nor_1k.png', scene)
      grassBump.uScale = grassBump.vScale = 50
      grassBump.level = .5
      groundMaterial.bumpTexture = grassBump

      this.ground.material = groundMaterial
      this.ground.receiveShadows = true
      this.ground.checkCollisions = true
      this.ground.useVertexColors = false
      this.ground.hasVertexAlpha = false // because we use vertex colors

      this.plants.addGrasses(this.ground, shadowGenerator)

      const treeMaterial = scene.getMaterialByName('Tree01') as StandardMaterial
      const treeMat = new PBRMaterial('tree', scene)
      treeMat.albedoTexture = (treeMaterial! as StandardMaterial).emissiveTexture!
      treeMat.albedoTexture.hasAlpha = true
      treeMat.directIntensity = 8
      treeMat.roughness = 1
      treeMat.metallic = 0
      treeMat.specularIntensity = 0
      treeMat.useAlphaFromAlbedoTexture = true
      treeMat.transparencyMode = Material.MATERIAL_ALPHATESTANDBLEND
      treeMat.backFaceCulling = false

      result.forEach(mesh => {
        // Gazebo
        if (mesh.name === 'Plane.005') {
          mesh.receiveShadows = true
          shadowGenerator.addShadowCaster(mesh)
        }

        if (mesh.name.indexOf('Bench') !== -1) {
          mesh.checkCollisions = true
        }

        if (mesh.name.indexOf('Tree') !== -1) {
          shadowGenerator.addShadowCaster(mesh)
          if ((mesh instanceof InstancedMesh)) {
            // Convert instance to clone
            const instance = (mesh as InstancedMesh)
            const clone = instance.sourceMesh.clone('clonedTree')
            clone.receiveShadows = true
            clone.position = instance.position
            clone.rotation = instance.rotation
            clone.rotationQuaternion = instance.rotationQuaternion
            clone.scaling = instance.scaling
            clone.material = treeMat
            instance.dispose()
          } else {
            (mesh as Mesh).receiveShadows = true;
            (mesh as Mesh).material = treeMat
          }
        }
      })
    })
  }
}