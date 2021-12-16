import { AbstractMesh, DeepImmutableObject, FollowCamera, Mesh, MeshBuilder, Ray, Scene, SceneLoader, SolidParticleSystem, StandardMaterial, Texture, Material, Color3 } from '@babylonjs/core'
import { WaterController } from './water.controller'

export class RainController {

  SPS!: SolidParticleSystem

  constructor(scene: Scene, water: WaterController, dense = false) {
    const rainMesh = MeshBuilder.CreatePlane('rain particle', {
      width: dense ? 2 : 2 / 16,
      height: dense ? 4 : 8 / 16 * 2
    }, scene)

    const rainMat = new StandardMaterial('rain material', scene)
    rainMat.opacityTexture = new Texture(`assets/${dense ? 'dense ' : ''}rain.png`, scene)
    rainMat.transparencyMode = Material.MATERIAL_ALPHABLEND
    rainMat.twoSidedLighting = true
    rainMat.emissiveColor = scene.fogColor
    rainMat.alpha = .5
    rainMat.backFaceCulling = false

    rainMesh.material = rainMat

    const SPS = this.SPS = new SolidParticleSystem('Debris', scene, {
      useModelMaterial: true,
      updatable: true
    })

    SPS.addShape(rainMesh, (dense ? 4 : 1) * 1024)
    rainMesh.dispose()
    SPS.buildMesh()

    const rainBoxSize = 60, rainBoxHeight = 20

    SPS.initParticles = () => {
      for (let p = 0; p < SPS.nbParticles; p++) {
        const particle = SPS.particles[p]  
        particle.position.set(
          Math.random() * rainBoxSize,
          Math.random() * rainBoxHeight,
          Math.random() * rainBoxSize
        )

        particle.rotation.x = Math.PI
        particle.rotation.y = Math.PI * Math.random()
      }
    }

    SPS.updateParticle = particle => {
      const s = .012 * scene.getEngine().getDeltaTime()
      particle.position.addInPlaceFromFloats(0, s * scene.gravity.y * 24, 0)

      if (particle.position.y < 0) {
        const target = (scene.activeCamera! as FollowCamera).target

        particle.position.y = rainBoxHeight + particle.position.y
        particle.position.z = target.z + (Math.random() - .5) * rainBoxSize
        particle.position.x = target.x + (Math.random() - .5) * rainBoxSize
      }

      return particle
    }

    SPS.initParticles()
    SPS.setParticles()

    SPS.isAlwaysVisible = true
    // SPS.billboard = true
    SPS.computeParticleRotation = false
    SPS.computeParticleColor = false
    SPS.computeParticleTexture = false
    SPS.computeParticleVertex = false

    SPS.mesh.applyFog = false
    SPS.mesh.alphaIndex = 19

    water.addToRenderList(SPS.mesh)

    this.SPS = SPS
  }

  update() {
    this.SPS.setParticles()
  }
}