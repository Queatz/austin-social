import { AbstractMesh, DeepImmutableObject, Material, MeshBuilder, Quaternion, Ray, Scene, SolidParticle, SolidParticleSystem, StandardMaterial, Texture, Vector3 } from '@babylonjs/core'
import { WaterController } from './water.controller'

export class DuckController {
  
  SPS!: SolidParticleSystem

  constructor(scene: Scene, water: WaterController) {
    const meshes = [
      'duck 1.png',
      'duck 2.png'
    ].map(url => {
      const texture = new Texture(`assets/${url}`, scene)
      texture.hasAlpha = true
      const mat = new StandardMaterial('mat', scene)
      mat.diffuseTexture = texture
      mat.useAlphaFromDiffuseTexture = true
      mat.backFaceCulling = false
      mat.transparencyMode = Material.MATERIAL_ALPHATEST
      mat.roughness = .2
      mat.specularPower = 128

      return mat
    }).map(mat => {
      const mesh = MeshBuilder.CreatePlane('duck', { 
        size: 1
       }, scene)
       mesh.material = mat

       return mesh
    })

    

    const SPS = new SolidParticleSystem('Duck SPS', scene, {
      useModelMaterial: true
    })
    meshes.forEach(mesh => {
      SPS.addShape(mesh, 121)
    })
    SPS.buildMesh()

    // meshes.forEach(mesh => {
    //   scene.removeMesh(mesh)
    // })

    const rg = 1000, floating = .15
    
    SPS.initParticles = () => {
        for (let p = 0; p < SPS.nbParticles; p++) {
            const particle = SPS.particles[p]
            particle.position.x = rg * (0.5 - Math.random())
            particle.position.y = water.waterMesh.position.y + floating
            particle.position.z = rg * (0.5 - Math.random())
        }
    }

    // SPS.updateParticle = (particle) => {
    //   if (water.waterMesh && Vector3.Distance(scene.activeCamera!.position, particle.position) < 10) {
    //     const ray = new Ray(particle.position.add(new Vector3(0, 5, 0)), new Vector3(0, -1, 0))
    //     const hit = ray.intersectsMesh(water.waterMesh as DeepImmutableObject<AbstractMesh>, false)
        
    //     if (hit.hit) {
    //       particle.position.y = hit.pickedPoint!.y + floating
    //     }
    //   }
    //   return particle
    // }

    SPS.initParticles()
    SPS.setParticles()

    SPS.isAlwaysVisible = true
    SPS.billboard = true
    SPS.computeParticleRotation = false
    SPS.computeParticleColor = false
    SPS.computeParticleTexture = false

    water.addToRenderList(SPS.mesh)

    this.SPS = SPS
  }
  
  update() {
    this.SPS.setParticles()
  }
}