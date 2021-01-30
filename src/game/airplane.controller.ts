import { Color3, FollowCamera, Material, Mesh, MeshBuilder, Scene, SolidParticleSystem, StandardMaterial, Texture } from '@babylonjs/core'

export class AirplaneController {

  SPS!: SolidParticleSystem

  constructor(scene: Scene) {
    const scatterMesh = MeshBuilder.CreatePlane('airplane', {
      size: 20,
      sideOrientation: Mesh.BACKSIDE
    }, scene)

    const SPS = this.SPS = new SolidParticleSystem('Debris', scene, {
      enableMultiMaterial: true,
      updatable: true
    })

    SPS.addShape(scatterMesh, 4)
    SPS.buildMesh()
    SPS.setMultiMaterial([
      'plane 1.png',
      'plane 2.png',
      'plane 3.png',
      'plane 4.png'
    ].map(x => {
      const mat = new StandardMaterial('plane', scene)
      mat.diffuseTexture = new Texture(`assets/${x}`, scene)
      mat.diffuseTexture.hasAlpha = true
      mat.linkEmissiveWithDiffuse = true
      mat.specularPower = 1024
      mat.diffuseColor = Color3.White().scale(4)
      mat.transparencyMode = Material.MATERIAL_ALPHATEST
      mat.useAlphaFromDiffuseTexture = true
      mat.twoSidedLighting = true
      return mat
    }))

    scatterMesh.dispose()

    const r = 1000

    SPS.initParticles = () => {
      for (let p = 0; p < SPS.nbParticles; p++) {
        const particle = SPS.particles[p]
        particle.materialIndex = Math.floor(Math.random() * 4)

        // Smaller jet
        if (particle.materialIndex === 3) {
          particle.scaling.scale(.75)
        }

        particle.position.set(
          (Math.random() - .5) * 2 * r,
          300 + Math.random() * 400,
          (Math.random() - .5) * 2 * r,
        )
        particle.rotation.x = Math.PI / 2
        particle.rotation.z = Math.PI / 2
      }
    }

    SPS.updateParticle = particle => {
      const s = .025 * scene.getEngine().getDeltaTime()
      particle.position.addInPlaceFromFloats(0, 0, s)

      const target = (scene.activeCamera! as FollowCamera).target

      if (particle.position.z - target.z > r) {
        particle.position.x = target.x + (Math.random() - .5) * 2 * r
        particle.position.z = target.z - r
      }

      return particle
    }

    SPS.initParticles()
    SPS.computeSubMeshes()
    SPS.setParticles()
    SPS.computeParticleTexture = false
    SPS.computeParticleColor = false
    SPS.computeBoundingBox = false
    SPS.computeParticleRotation = false
    SPS.isAlwaysVisible = true

    SPS.mesh.applyFog = false

    SPS.mesh.onBeforeBindObservable.add(() => {
      SPS.setParticles()
    })
  }
}