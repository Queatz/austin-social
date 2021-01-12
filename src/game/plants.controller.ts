import { Mesh, ShadowGenerator, SceneLoader, VertexBuffer, Texture, PBRMaterial, Color3, SolidParticleSystem, Vector3, Material } from '@babylonjs/core'

// See https://playground.babylonjs.com/#NFSGWT#2 for better scattering

export class PlantsController {
  addGrasses(ground: Mesh, shadowGenerator: ShadowGenerator): void {
    SceneLoader.LoadAssetContainer('assets/', 'grass.glb', ground.getScene(), meshes => {
      const positions = ground.getVerticesData(VertexBuffer.PositionKind)!
      const colors = ground.getVerticesData(VertexBuffer.ColorKind)!
      const count = ground.getTotalVertices()
      const indices = ground.getIndices()!

      const grassMesh = meshes.meshes.find(x => x.name === 'GrassPatch01') as Mesh

      const tex = new Texture('assets/grass.png', ground.getScene())
      tex.vScale = -1

      const grassMat = new PBRMaterial('grass', ground.getScene())
      grassMat.albedoColor = Color3.White()
      grassMat.albedoTexture = tex
      grassMat.roughness = 1
      grassMat.metallic = 0
      grassMat.specularIntensity = 0
      grassMat.albedoTexture.hasAlpha = true
      grassMat.useAlphaFromAlbedoTexture = true
      grassMat.transparencyMode = Material.MATERIAL_ALPHATEST
      grassMat.backFaceCulling = false
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
    })
  }
}