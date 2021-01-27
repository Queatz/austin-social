import { Material, MeshBuilder, Quaternion, Scene, ShadowGenerator, SolidParticle, SolidParticleSystem, StandardMaterial, Texture, Vector3 } from '@babylonjs/core'

export class BirdController {
  
  SPS!: SolidParticleSystem

  constructor(scene: Scene, shadowGenerator: ShadowGenerator) {
    const mat = new StandardMaterial('mat', scene)
    const texture = new Texture('assets/flying bird.png', scene)
    texture.hasAlpha = true
    mat.diffuseTexture = texture
    mat.useAlphaFromDiffuseTexture = true
    mat.backFaceCulling = false
    mat.transparencyMode = Material.MATERIAL_ALPHATEST

    const birdie = MeshBuilder.CreatePlane('birdie', { 
      width: 2,
      height: 2 * (183 / 326)
     }, scene)
    birdie.material = mat

    const SPS = new SolidParticleSystem('Bird SPS', scene, {})
    SPS.addShape(birdie, 75)
    SPS.buildMesh()
    SPS.mesh.material = mat
    birdie.dispose()

    const rg = 2000
    
    SPS.initParticles = () => {
        for (let p = 0; p < SPS.nbParticles; p++) {
            const particle = SPS.particles[p]
            particle.position.x = rg * (0.5 - Math.random())
            particle.position.y = 45 + rg * (0.5 - Math.random()) / 45
            particle.position.z = rg * (0.5 - Math.random())
        }
    }

    SPS.updateParticle = (particle: SolidParticle) => {
        const d = Vector3.Distance(Vector3.Zero(), particle.position)
        particle.position.rotateByQuaternionAroundPointToRef(
            Quaternion.FromEulerAngles(0, (scene.deltaTime || 0) / -50 / d, 0),
            Vector3.Zero(),
            particle.position
        )
        return particle
    }

    SPS.initParticles()

    SPS.isAlwaysVisible = true
    SPS.billboard = true
    SPS.computeParticleRotation = false
    SPS.computeParticleColor = false
    SPS.computeParticleTexture = false

    this.SPS = SPS
  }
  
  update() {
    this.SPS.setParticles()
  }
}