import { Mesh, ShadowGenerator, SceneLoader, VertexBuffer, Texture, PBRMaterial, Color3, SolidParticleSystem, Vector3, Material, ShaderMaterial } from '@babylonjs/core'
import { PBRCustomMaterial } from '@babylonjs/materials'
import { getGrassMaterial } from './materials/grass.material'
import { WaterController } from './water.controller'

// See https://playground.babylonjs.com/#NFSGWT#2 for better scattering

export class PlantsController {
  addGrasses(ground: Mesh, water: WaterController, shadowGenerator: ShadowGenerator): void {
    SceneLoader.LoadAssetContainer('assets/', 'grass.glb', ground.getScene(), meshes => {
      const positions = ground.getVerticesData(VertexBuffer.PositionKind)!
      const colors = ground.getVerticesData(VertexBuffer.ColorKind)!
      const count = ground.getTotalVertices()
      const indices = ground.getIndices()!

      const grassMesh = meshes.meshes.find(x => x.name === 'GrassPatch01') as Mesh

      const tex = new Texture('assets/grass.png', ground.getScene())
      tex.hasAlpha = true
      tex.vScale = -1

      const grassMat = new PBRCustomMaterial('grass', ground.getScene())
      grassMat.albedoTexture = tex
      grassMat.directIntensity = 4
      grassMat.roughness = .7
      grassMat.metallic = .3
      grassMat.specularIntensity = 0
      grassMat.useAlphaFromAlbedoTexture = true
      grassMat.transparencyMode = Material.MATERIAL_ALPHATEST
      grassMat.backFaceCulling = false
      grassMat.AddUniform('time', 'float', null)

      let time = 0

      grassMat.onBindObservable.add(() => { 
        time += ground.getScene().deltaTime || 0
        grassMat.getEffect().setFloat('time', time);
      })
               
      grassMat.Vertex_Before_PositionUpdated(`
        float influence = pow(1. - uv.y, 2.) / 8.;
        float t = time / 4000. + positionUpdated.x / 4. + positionUpdated.y / 4.;

        result = vec3(positionUpdated + influence * vec3(sin(t), 0., cos(t)));
      `)
      grassMesh.material = grassMat
      
      const SPS = new SolidParticleSystem('SPS', ground.getScene(), {
        useModelMaterial: true
      })
      SPS.addShape(grassMesh, count)
      meshes.dispose() 
      const mesh = SPS.buildMesh()

      mesh.position = ground.position
      mesh.rotation = ground.rotation
      mesh.rotationQuaternion = ground.rotationQuaternion
      mesh.parent = ground.parent

      SPS.initParticles = () => {
          for (let p = 0; p < count; p++) {
              const particle = SPS.particles[p]  
              particle.position = Vector3.FromArray(positions, p * 3)//.addInPlace(ground.position)
          
              const scale = colors[p * 4] > .25 ? 1/25 : 0
              particle.scale.x = scale
              particle.scale.y = scale * 5
              particle.scale.z = scale
          }
      }

      SPS.isAlwaysVisible = true
      SPS.initParticles()
      SPS.setParticles()

      shadowGenerator.addShadowCaster(SPS.mesh)
      water.addToRenderList(SPS.mesh)
    })
  }
}