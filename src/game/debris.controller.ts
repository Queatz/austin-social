import { AbstractMesh, DeepImmutableObject, FollowCamera, Mesh, Ray, Scene, SceneLoader, SolidParticleSystem, Vector3 } from '@babylonjs/core'

export class DebrisController {

  SPS!: SolidParticleSystem

  constructor(scene: Scene, ground: Mesh) {
    SceneLoader.LoadAssetContainer('assets/', 'leaves.glb', scene, container => {
      const scatterMesh = container.meshes.find(x => x.name === 'Dry Leaf') as Mesh

      const SPS = this.SPS = new SolidParticleSystem('Debris', scene, {
        particleIntersection: true,
        useModelMaterial: true,
        updatable: true
      })

      SPS.addShape(scatterMesh, 22)
      SPS.buildMesh()

      SPS.initParticles = () => {
        for (let p = 0; p < SPS.nbParticles; p++) {
          const particle = SPS.particles[p]  
          particle.position.set(
            Math.random() * 20,
            Math.random() * 20,
            Math.random() * 20
          )
          particle.scaling.scaleInPlace((1 + Math.random()) / 2)
          particle.rotation.addInPlaceFromFloats(Math.PI * Math.random(), Math.PI * Math.random(), Math.PI * Math.random())
          particle.props = { grounded: 0 }
        }
      }

      const ray = new Ray(new Vector3(), new Vector3(0, 1, 0))

      SPS.updateParticle = particle => {
        const s = .012 * scene.getEngine().getDeltaTime()
        particle.position.addInPlaceFromFloats(-0.15 * s, particle.props.grounded > 0 ? -scene.gravity.y * .25 * .5 : (scene.gravity.y * .25), -.1 * s)
        particle.rotation.addInPlaceFromFloats(.25 * Math.random(), .15 * Math.random(), .125 * Math.random())

        if (particle.props.grounded > 0) {
          particle.props.grounded--;
        } else if (particle.intersectsMesh(ground)) {
          ray.origin.copyFrom(particle.position)
          const hit = ray.intersectsMesh(ground as DeepImmutableObject<AbstractMesh>, false)
          
          if (hit.hit) {
            particle.props.grounded = 60
            particle.position.y = hit.pickedPoint!.y + 0.1
          }
        }

        const target = (scene.activeCamera! as FollowCamera).target

        if (Vector3.Distance(particle.position, target) > 30) {
          particle.props.grounded = 0
          particle.position.copyFrom(target.add(new Vector3(
            1.5 * 10 + Math.random() * 10,
            Math.random() * 20,
            1. * 10 + Math.random() * 10
          )))
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