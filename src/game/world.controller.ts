import { InstancedMesh, Material, Mesh, PBRMaterial, Scene, SceneLoader, ShadowGenerator, StandardMaterial, Texture } from '@babylonjs/core'
import { PBRCustomMaterial } from '@babylonjs/materials'
import { PlantsController } from './plants.controller'
import { WaterController } from './water.controller'

export class WorldController {

  ground?: Mesh
  plants = new PlantsController()

  constructor(scene: Scene, water: WaterController, shadowGenerator: ShadowGenerator, worldFileName: string) {
    SceneLoader.ImportMesh('', '/assets/', worldFileName, scene, result => {
      this.ground = scene.getMeshByName('Peninsula') as Mesh

      const groundMaterial = new PBRMaterial('pbr', scene)
      groundMaterial.metallic = 0
      groundMaterial.roughness = .7
      const texture = new Texture('assets/textures/grass.texture.png', scene)
      texture.wrapU = texture.wrapV = Texture.MIRROR_ADDRESSMODE
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

      this.plants.addGrasses(this.ground, water, shadowGenerator)

      const treeMaterial = scene.getMaterialByName('Tree01') as StandardMaterial
      const treeMat = new PBRCustomMaterial('tree', scene)
      treeMat.albedoTexture = (treeMaterial! as StandardMaterial).emissiveTexture!
      treeMat.albedoTexture.hasAlpha = true
      treeMat.directIntensity = 8
      treeMat.roughness = 1
      treeMat.metallic = 0
      treeMat.specularIntensity = 0
      treeMat.useAlphaFromAlbedoTexture = true
      treeMat.transparencyMode = Material.MATERIAL_ALPHATESTANDBLEND
      treeMat.backFaceCulling = false
      treeMat.AddUniform('time', 'float', null)

      let time = 0

      treeMat.onBindObservable.add(() => { 
        time += scene.deltaTime || 0
        treeMat.getEffect().setFloat('time', time);
      })
               
      treeMat.Vertex_Before_PositionUpdated(`
        vec4 worldPosition = world * vec4(positionUpdated, 1.);
        float influence = pow(1. - uv.y, 3.) / 24.;
        float t = time / 8000. / 15. + (worldPosition.x * 15.) + (worldPosition.y * 15.);

        result = vec3(positionUpdated + influence * vec3(sin(t), cos(t), 0.));
      `)

      result.forEach(mesh => {
        // Gazebo
        if (mesh.name === 'Plane.005') {
          mesh.receiveShadows = true
          shadowGenerator.addShadowCaster(mesh)
          water.addToRenderList(mesh as Mesh)
        }

        if (mesh.name.indexOf('Bench') !== -1) {
          mesh.checkCollisions = true
        }

        if (mesh.name.indexOf('Tree') !== -1) {
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
            shadowGenerator.addShadowCaster(clone)
            water.addToRenderList(clone)
          } else {
            (mesh as Mesh).receiveShadows = true;
            (mesh as Mesh).material = treeMat
            shadowGenerator.addShadowCaster(mesh as Mesh)
            water.addToRenderList(mesh as Mesh)
          }
        }
      })
    })
  }
}