import { AbstractMesh, DeepImmutableObject, Mesh, Quaternion, Ray, Scene, SceneLoader, SolidParticleSystem, Vector3 } from '@babylonjs/core'

export class DebrisController {

  SPS!: SolidParticleSystem

  constructor(scene: Scene, ground: Mesh) {
    SceneLoader.LoadAssetContainer('assets/', 'leaves.glb', scene, container => {
      const scatterMesh = container.meshes.find(x => x.name === 'Dry Leaf') as Mesh

      const SPS = this.SPS = new SolidParticleSystem('Debris', scene, {
        particleIntersection: true,
        boundingSphereOnly: true,
        useModelMaterial: true,
        updatable: true
      })

      SPS.addShape(scatterMesh, 2200)
      const mesh = SPS.buildMesh()

      SPS.initParticles = () => {
        for (let p = 0; p < SPS.nbParticles; p++) {
          const particle = SPS.particles[p]  
          particle.position.set(
            Math.random() * 199,
            Math.random() * 19,
            Math.random() * 199
          )
          particle.scaling.scaleInPlace((1 + Math.random()) / 2)
        }
      }

      const vec = Vector3.Zero()

      SPS.updateParticle = particle => {
        particle.rotation.rotateByQuaternionToRef(
          Quaternion.FromEulerAngles(.05, .05, -.025),
          vec
        )

        particle.position.addInPlaceFromFloats(-0.15 / 2, scene.gravity.y, -.1 / 2)
        particle.rotation.addInPlaceFromFloats(.25 * Math.random(), .15 * Math.random(), .125 * Math.random())

        if (particle.intersectsMesh(ground)) {
          const ray = new Ray(particle.position.add(new Vector3(0, 5, 0)), new Vector3(0, -1, 0))
          const hit = ray.intersectsMesh(ground as DeepImmutableObject<AbstractMesh>, false)
          
          if (hit.hit) {
            particle.position.y = hit.pickedPoint!.y + 0.2
          }
        }

        return particle
      }

      SPS.isAlwaysVisible = true
      SPS.initParticles()
      SPS.setParticles()
      SPS.computeParticleTexture = false
      SPS.computeParticleColor = false

      SPS.mesh.onBeforeBindObservable.add(() => {
        SPS.setParticles()
      })
    })
  }
}