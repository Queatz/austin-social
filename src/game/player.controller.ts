import { AbstractMesh, Animation, CascadedShadowGenerator, Color3, DeepImmutableObject, EasingFunction, Material, Mesh, MeshBuilder, MorphTarget, PBRMaterial, PowerEase, Ray, Scalar, SceneLoader, Sound, Vector3 } from '@babylonjs/core'
import { InputController } from './input.controller'
import { GameScreen } from './screens/game.screen'
import { WaterController } from './water.controller'
import { WorldController } from './world.controller'

export class PlayerController {

  sitting = false
  posing = false
  hero: Mesh

  heroSpeed = .002
  heroSpeedBackwards = .002
  heroRotationSpeed = Math.PI / 360 / 4

  walkingSound: Sound

  animating = true

  weights = {
    idle: 1,
    walking: 0,
    sitting: 0,
    pose: 0
  }

  smile = 0
  smileTarget = 0

  cameraTargetMesh?: Mesh
  cameraTarget?: Mesh

  humanScale = .480304
  heroSize = .5
  smileMorph?: MorphTarget
  smileMorphLips?: MorphTarget

  constructor(private screen: GameScreen, private shadowGenerator: CascadedShadowGenerator, private water: WaterController, private world: WorldController, private input: InputController) {
    this.walkingSound = new Sound('sound', 'assets/walk.ogg', screen.scene)
    
    this.hero = MeshBuilder.CreateBox('hero', {
      size: this.heroSize
    }, screen.scene)

    this.hero.checkCollisions = true
    this.hero.ellipsoid = new Vector3(1, 4, 1)
    this.hero.ellipsoidOffset = new Vector3(0, 4, 0)
    this.hero.isVisible = false

    SceneLoader.ImportMesh('', '/assets/', 'human.glb', screen.scene, result => {
      const human = screen.scene.getMeshByName('Human_primitive0') as Mesh

      const material = new PBRMaterial('pbr', screen.scene)
      material.albedoColor = Color3.FromHexString('#7C492B').toLinearSpace() // F0AFAF // F5BC88 // 4F2F1C // FFC6C0 // 7C492B
      material.metallic = 0
      material.roughness = .7
      material.directIntensity = 1.6
      material.clearCoat.isEnabled = true
      material.clearCoat.intensity = .2
      material.clearCoat.roughness = .4
      human.material = material

      const eyeL = screen.scene.getMeshByName('Eye L') as Mesh
      const eyeR = screen.scene.getMeshByName('Eyes R') as Mesh

      eyeL.rotation = new Vector3(-Math.PI / 2, 0.1, 0)
      eyeR.rotation = new Vector3(-Math.PI / 2, -0.1, 0)

      water.addToRenderList(human)

      this.cameraTargetMesh = screen.scene.getMeshByName('Eye L') as Mesh

      [
        screen.scene.getMeshByName('Human_primitive0') as Mesh,
        screen.scene.getMeshByName('Human_primitive1') as Mesh,
        screen.scene.getMeshByName('Human_primitive2') as Mesh
      ].forEach(mesh => {
        mesh.hasVertexAlpha = false
        mesh.onBeforeRenderObservable.add(() => {
          mesh.refreshBoundingInfo(true)
        })
      })

      const morphTargetIndex = 4
      this.smileMorph = human.morphTargetManager!.getTarget(morphTargetIndex)
      this.smileMorphLips = (screen.scene.getMeshByName('Human_primitive1') as Mesh).morphTargetManager!.getTarget(morphTargetIndex)

      const humanRoot = result[0]

      this.cameraTarget = MeshBuilder.CreateBox('cameraTarget', {
        width: .0125,
        depth: .0125,
        height: .0125
      }, screen.scene)

      this.cameraTarget.isVisible = false
      screen.camera.lockedTarget = this.cameraTarget
      screen.camera.cameraDirection = new Vector3(0, 0, -1)
      screen.camera.rotationOffset = 180

      humanRoot.parent = this.hero
      humanRoot.position.copyFrom(new Vector3(0, .84, 0))

      humanRoot.scaling.scaleInPlace(this.humanScale)

      human.receiveShadows = true
      shadowGenerator.addShadowCaster(human)

      const skel = human.skeleton!
      const head = skel.bones[skel.getBoneIndexByName('Head')]
      const skelHeadBone = skel.bones[skel.getBoneIndexByName('Head')]

      screen.overlay.text('Anya of Earth', skelHeadBone, humanRoot, false)

      screen.game.say.subscribe(say => {
        screen.overlay.text(say, skelHeadBone, humanRoot, true)
      })  

      // Character Customization

      // SceneLoader.ImportMesh('', '/assets/', 'hairs-short.glb', screen.scene, hairz => {
      //   hairz[1].attachToBone(head, humanRoot)
      //   hairz[1].position = new Vector3(0, .3, -.1)
      //   hairz[1].rotation = new Vector3(-Math.PI / 12, 0, 0)

      //   const hairMat = new PBRMaterial('hair', screen.scene)
      //   hairMat.albedoColor = Color3.FromHexString('#1A0C09').toLinearSpace().scale(3)
      //   hairMat.roughness = .4
      //   hairMat.metallic = .2
      //   hairMat.sheen.isEnabled = true
      //   hairMat.sheen.linkSheenWithAlbedo = true
      //   hairMat.anisotropy.isEnabled = true
      //   hairMat.anisotropy.intensity = .8
      //   hairMat.backFaceCulling = false
      //   hairz[1].material = hairMat

      //   hairz[1].receiveShadows = true
      //   shadowGenerator.addShadowCaster(hairz[1])
      // })

      // Character Customization

      // SceneLoader.ImportMesh('', '/assets/', 'eyes.glb', screen.scene, hairz => {
      //   const skel = human.skeleton!
      //   const head = skel.bones[skel.getBoneIndexByName('Head')]
      //   hairz[1].attachToBone(head, humanRoot)
      //   hairz[2].attachToBone(head, humanRoot)
      //   hairz[1].position = new Vector3(0.068, -0.234956, 0.05)
      //   hairz[1].rotation = new Vector3(-Math.PI / 2 - 0.24, 0.2, 0)
      //   hairz[2].position = new Vector3(-0.068, -0.234956, 0.05)
      //   hairz[2].rotation = new Vector3(-Math.PI / 2 - 0.24, -0.2, 0)

      //   this.cameraTargetMesh = Eye L_primitive0
      // })
    })
  }

  update() {
    const walkAnim = this.screen.scene.getAnimationGroupByName('Walking')
    const idleAnim = this.screen.scene.getAnimationGroupByName('Idle')
    const sittingAnim = this.screen.scene.getAnimationGroupByName('Sitting')
    const poseAnim = this.screen.scene.getAnimationGroupByName('Pose')

    let keydown = false, didSit = false, didPose = false

    if (this.input.pressed('w')) {  
        this.hero.moveWithCollisions(this.hero.forward.scaleInPlace(this.heroSpeed * this.screen.scene.deltaTime))
        keydown = true
    }
    if (this.input.pressed('e')) {  
      this.hero.moveWithCollisions(this.hero.forward.scaleInPlace(this.heroSpeed * 4 * this.screen.scene.deltaTime))
      keydown = true
    }
    if (this.input.pressed('s')) {
        this.hero.moveWithCollisions(this.hero.forward.scaleInPlace(-this.heroSpeedBackwards * this.screen.scene.deltaTime))
        keydown = true
    }
    if (this.input.pressed('a')) {
        this.hero.rotate(Vector3.Up(), -this.heroRotationSpeed * this.screen.scene.deltaTime)
        keydown = true
    }
    if (this.input.pressed('d')) {
        this.hero.rotate(Vector3.Up(), this.heroRotationSpeed * this.screen.scene.deltaTime)
        keydown = true
    }
    if (this.input.pressed('b')) {
        keydown = true
    }
    if (this.input.pressed('r')) {
        didSit = true
    }
    if (this.input.pressed('p')) {
        didPose = true
    }
    if (this.input.pressed('t')) {
      if (this.smile === 0) {
        this.smileTarget = 1
      } else if (this.smile === 1) {
        this.smileTarget = 0
      }
    }

    const fovEase = new PowerEase()
    fovEase.setEasingMode(EasingFunction.EASINGMODE_EASEOUT)

    if (keydown) {
      if (!this.walkingSound.isPlaying) {
        this.walkingSound.loop = true
        this.walkingSound.play()
      }
        if (this.sitting) {
          this.sitting = false
          Animation.CreateAndStartAnimation('fov anim', this.screen.camera, 'fov', 60, 30, this.screen.camera.fov, .6, 0, fovEase)
          this.shadowGenerator.splitFrustum()
        }

        if (!this.animating) {
          this.animating = true
          walkAnim?.start(true, 1, walkAnim.from, walkAnim.to, false)
        }
    }
    else {
      if (this.walkingSound.isPlaying) {
        this.walkingSound.stop()
      }

      if (didSit) {
        if (this.sitting && this.weights.sitting === 1) {
          this.sitting = false
          this.animating = true

          Animation.CreateAndStartAnimation('fov anim', this.screen.camera, 'fov', 60, 30, this.screen.camera.fov, .6, 0, fovEase)
          this.shadowGenerator.splitFrustum()
        } else if (!this.sitting && this.weights.sitting === 0) {
          sittingAnim?.start(true, 1, sittingAnim.from, sittingAnim.to, false)
          this.sitting = true
          this.animating = false

          Animation.CreateAndStartAnimation('fov anim', this.screen.camera, 'fov', 60, 30, this.screen.camera.fov, .4, 0, fovEase)
          this.shadowGenerator.splitFrustum()
        }
      }

      if (didPose) {
        if (this.posing && this.weights.pose === 1) {
          this.posing = false
          this.animating = true
        } else if (!this.posing && this.weights.pose === 0) {
          poseAnim?.start(true, 1, poseAnim!.to, poseAnim!.to, false)
          this.posing = true
          this.animating = false
        }
      }

      if (this.animating && !this.sitting && !this.posing) {
        idleAnim?.start(true, 1, idleAnim.from, idleAnim.to, false)
        this.animating = false
      }
    }

    if (this.water.waterMesh) {
      const ray = new Ray(this.hero.position.add(new Vector3(0, -.1 + 1 - this.heroSize / 2, 0)), new Vector3(0, 1, 0))
      const hit = ray.intersectsMesh(this.water.waterMesh as DeepImmutableObject<AbstractMesh>, false)
      
      if (hit.hit) {
        this.hero.moveWithCollisions(new Vector3(0, 16 * hit.distance * this.screen.scene.deltaTime / 1000, 0))
      }
    }

    if (this.world.ground) {
      const ray = new Ray(this.hero.position.add(new Vector3(0, -.1 - this.heroSize / 2, 0)), new Vector3(0, 1, 0))
      const hit = ray.intersectsMesh(this.world.ground as DeepImmutableObject<AbstractMesh>, false)

      if (!hit.hit) {
        this.hero.moveWithCollisions(new Vector3(0, -9.81 * this.screen.scene.deltaTime / 1000, 0))
      } else {
        this.hero.position.y = hit.pickedPoint!.y + this.heroSize / 2
      }
    }

    if (this.water.waterMesh) {
      const ray = new Ray(this.screen.camera.position, new Vector3(0, 1, 0))
      const hit = ray.intersectsMesh(this.water.waterMesh as DeepImmutableObject<AbstractMesh>, false)
      
      if (hit.hit && !this.screen.isUnderwater()) {
        this.screen.setUnderwater(true)
      } else if (!hit.hit && this.screen.isUnderwater()) {
        this.screen.setUnderwater(false)
      }
    }

    this.updateAnimations()
  }

  updateAnimations() {
    const [ animating, weights, scene, sitting, posing ] = [
       this.animating, this.weights, this.screen.scene, this.sitting, this.posing
    ]

    const speed = 4
    
    if (this.screen.scene.deltaTime) {
      if (animating && weights.walking < 1) {
        weights.walking += scene.deltaTime / 1000 * speed
      } else if (!animating && weights.walking > 0) {
        weights.walking -= scene.deltaTime / 1000 * speed * 1.5
      }

      if (sitting && weights.sitting < 1) {
        weights.sitting += scene.deltaTime / 1000 * speed
      } else if (!sitting && weights.sitting > 0) {
        weights.sitting -= scene.deltaTime / 1000 * speed * 1.5
      }

      if (posing && weights.pose < 1) {
        weights.pose += scene.deltaTime / 1000 * speed
      } else if (!posing && weights.pose > 0) {
        weights.pose -= scene.deltaTime / 1000 * speed * 1.5
      }

      if (!(animating || sitting || posing) && weights.idle < 1) {
        weights.idle += scene.deltaTime / 1000 * speed
      } else if ((animating || sitting || posing) && weights.idle > 0) {
        weights.idle -= scene.deltaTime / 1000 * speed * 1.5
      }

      weights.walking = Math.min(1, Math.max(0, weights.walking))
      weights.sitting = Math.min(1, Math.max(0, weights.sitting))
      weights.idle = Math.min(1, Math.max(0, weights.idle))
      weights.pose = Math.min(1, Math.max(0, weights.pose))
    }

    const walkAnim = this.screen.scene.getAnimationGroupByName('Walking')
    const idleAnim = this.screen.scene.getAnimationGroupByName('Idle')
    const sittingAnim = this.screen.scene.getAnimationGroupByName('Sitting')
    const poseAnim = this.screen.scene.getAnimationGroupByName('Pose')
    walkAnim?.setWeightForAllAnimatables(weights.walking)
    sittingAnim?.setWeightForAllAnimatables(weights.sitting)
    idleAnim?.setWeightForAllAnimatables(weights.idle)
    poseAnim?.setWeightForAllAnimatables(weights.pose)

    if (this.smile !== this.smileTarget) {
      this.smile += 0.005 * this.screen.scene.deltaTime * (this.smile < this.smileTarget ? 1 : -1)
      this.smile = Scalar.Clamp(this.smile, 0, 1)
    }

    if (this.smileMorph && this.smileMorphLips) {
      const smileEase = new PowerEase(2)
      smileEase.setEasingMode(EasingFunction.EASINGMODE_EASEIN)
      const influence = smileEase.ease(this.smile)
      this.smileMorph.influence = influence
      this.smileMorphLips.influence = influence
      }
  }

  updateCamera() {
    if (this.cameraTargetMesh) {
      const offset = new Vector3(0, this.cameraTargetMesh.getBoundingInfo().boundingBox.extendSize.y, 0)
      offset.rotateByQuaternionToRef(this.cameraTargetMesh.absoluteRotationQuaternion, offset)
      this.cameraTarget!.position.copyFrom(this.cameraTargetMesh.absolutePosition.add(offset))

      if (this.hero.rotationQuaternion) {
        this.cameraTarget!.rotationQuaternion = this.hero.rotationQuaternion.clone()
      }

      this.screen.pipeline.depthOfField.focusDistance = this.cameraTarget!.getDistanceToCamera() * 1000
    }
  }
}
