import { InstancedMesh, Material, Mesh, MeshBuilder, PBRMaterial, Quaternion, Scalar, Scene, SceneLoader, ShadowGenerator, StandardMaterial, Texture, Vector3, VertexBuffer } from '@babylonjs/core'
import { PBRCustomMaterial } from '@babylonjs/materials'
import { getMixMaterial } from './materials/mix.material'
import { PlantsController } from './plants.controller'
import { WaterController } from './water.controller'

export class WorldController {

  ground?: Mesh
  plants = new PlantsController()

  constructor(scene: Scene, water: WaterController, shadowGenerator: ShadowGenerator, worldFileName: string) {
    SceneLoader.ImportMesh('', '/assets/', worldFileName, scene, result => {
      this.ground = scene.getMeshByName('Peninsula') as Mesh

      const textureSand = new Texture('assets/textures/peninsula sand.jpg', scene)
      textureSand.uScale = textureSand.vScale = 200
      const textureGrass = new Texture('assets/textures/peninsula grass.jpg', scene)
      textureGrass.uScale = textureGrass.vScale = 200
      const textureGround = new Texture('assets/textures/peninsula ground leaves.jpg', scene)
      textureGround.uScale = textureGround.vScale = 200

      const mixTexture = (this.ground.material as PBRMaterial).albedoTexture as Texture
      const groundMaterial = getMixMaterial(mixTexture, textureSand, textureGrass, textureGround)

      this.ground!.material = groundMaterial

      this.ground.receiveShadows = true
      this.ground.checkCollisions = true
      this.ground.useVertexColors = false
      this.ground.hasVertexAlpha = false // because we use vertex colors

      result.forEach(mesh => {
        if (mesh.name.startsWith('Pillar')) {
          mesh.checkCollisions = true
          shadowGenerator.addShadowCaster(mesh)
          water.addToRenderList(mesh)
        } else if (mesh.name.startsWith('Angled Tree')) {
          mesh.checkCollisions = true
          mesh.hasVertexAlpha = false
          shadowGenerator.addShadowCaster(mesh)
        } else if (mesh.name.startsWith('Sitting Area')) {
          mesh.checkCollisions = true
          shadowGenerator.addShadowCaster(mesh)
        } else if (mesh.name.startsWith('Trash Can')) {
          mesh.checkCollisions = true
          shadowGenerator.addShadowCaster(mesh)
        } else if (mesh.name.startsWith('Small Tree')) {
          shadowGenerator.addShadowCaster(mesh)
          mesh.position.copyFrom(mesh.absolutePosition)
          mesh.parent = null
          mesh.useVertexColors = true

          const data = new Array(mesh.getTotalVertices()! * 4)
          data.fill(0)
          mesh.setVerticesData(VertexBuffer.ColorKind, data, false)

          const meshMat = mesh.material! as PBRMaterial
          const treeMat = new PBRCustomMaterial('tree', scene)
          treeMat.albedoTexture = meshMat.albedoTexture!
          treeMat.albedoTexture.hasAlpha = true
          treeMat.directIntensity = 8
          treeMat.roughness = 1
          treeMat.metallic = 0
          treeMat.specularIntensity = 0
          treeMat.useAlphaFromAlbedoTexture = true
          treeMat.transparencyMode = Material.MATERIAL_ALPHATEST
          treeMat.backFaceCulling = false

          mesh.rotation.setAll(0)
          mesh.rotationQuaternion = Quaternion.Zero()
          mesh.billboardMode = Mesh.BILLBOARDMODE_Y

          treeMat.Vertex_MainEnd(`
            vColor = vec4(1.);
          `)
          treeMat.AddUniform('time', 'float', null)

          treeMat.onBindObservable.add(() => { 
            time += scene.getEngine().getDeltaTime()
            treeMat.getEffect().setFloat('time', time);
          })
                   
          treeMat.Vertex_Before_PositionUpdated(`
            float influence = pow(1. - uv.y, 3.) / 8.;
            float t = time / 8000. / 15. + (color.x * 512.);
    
            result = vec3(positionUpdated + influence * vec3(sin(t), cos(t), 0.));

            if (color.x < .5) {
              uvUpdated.x = 1. - uvUpdated.x;
            }
          `)

          mesh.material = treeMat

          setTimeout(() => {
            this.plants.scatter(scene, undefined, mesh as Mesh, .1, this.ground!, water, shadowGenerator, particle => {
              particle.color!.r = Math.random()
              particle.rotation.z = Math.random() * Math.PI / 16
            }, undefined, (mesh: Mesh) => {
              mesh.useVertexColors = true
            }, undefined, true)
          })
        }
      })

      // this.plants.addGrasses(scene, this.ground, water, shadowGenerator)
      // this.plants.addGrassPatches(scene, this.ground, water, shadowGenerator)
      // this.plants.addThistles(scene, this.ground, water, shadowGenerator)
      // this.plants.addRocks(scene, this.ground, water, shadowGenerator)
      // this.plants.addYellowTwigs(scene, this.ground, water, shadowGenerator)

      const treeMaterial = scene.getMaterialByName('Tree01') as PBRMaterial
      const treeMat = new PBRCustomMaterial('tree', scene)
      treeMat.albedoTexture = treeMaterial.albedoTexture!
      treeMat.albedoTexture.hasAlpha = true
      treeMat.directIntensity = 8
      treeMat.roughness = 1
      treeMat.metallic = 0
      treeMat.specularIntensity = 0
      treeMat.useAlphaFromAlbedoTexture = true
      treeMat.transparencyMode = Material.MATERIAL_ALPHATEST
      treeMat.backFaceCulling = false
      treeMat.AddUniform('time', 'float', null)

      let time = 0

      treeMat.onBindObservable.add(() => { 
        time += scene.getEngine().getDeltaTime()
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

        if (mesh.name.startsWith('Bench')) {
          mesh.checkCollisions = true
        }

        if (mesh.name.startsWith('Tree01')) {
          const collider = MeshBuilder.CreateBox('Collision', {
            size: .1
          }, scene)
          collider.isVisible = false
          collider.collisionRetryCount = 5
          collider.checkCollisions = true
          collider.position.copyFromFloats(0, .06, .45)
          collider.parent = mesh
          
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