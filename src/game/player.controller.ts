import { AbstractMesh, Animation, Bone, CascadedShadowGenerator, Color3, DeepImmutableObject, EasingFunction, Mesh, MeshBuilder, PBRMaterial, PowerEase, Ray, SceneLoader, ShadowGenerator, Sound, Vector3 } from '@babylonjs/core'
import { InputController } from './input.controller'
import { GameScreen } from './screens/game.screen'
import { WaterController } from './water.controller'

export class PlayerController {

  sitting = false
  hero: Mesh

  heroSpeed = .05
  heroSpeedBackwards = .1
  heroRotationSpeed = Math.PI / 180 * 5

  walkingSound: Sound

  animating = true

  weights = {
    idle: 1,
    walking: 0,
    sitting: 0
  }

  cameraTargetMesh?: Mesh
  cameraTarget?: Mesh
  
  constructor(private screen: GameScreen, private shadowGenerator: CascadedShadowGenerator, private water: WaterController, private input: InputController) {
    this.walkingSound = new Sound('sound', 'assets/walk.ogg', screen.scene)
    
    this.hero = MeshBuilder.CreateBox('hero', {
      width: .5,
      depth: .5,
      height: .5
    }, screen.scene)

    this.hero.ellipsoid = new Vector3(.5, .5, .5)
    this.hero.isVisible = false

    SceneLoader.ImportMesh('', '/assets/', 'human.glb', screen.scene, result => {
      const human = screen.scene.getMeshByName('Human_Cube') as Mesh

      const material = new PBRMaterial('pbr', screen.scene)
      material.albedoColor = Color3.FromHexString('#F5BC88').toLinearSpace() // F5BC88 // 4F2F1C // FFC6C0
      material.metallic = 0
      material.roughness = .6
      material.sheen.isEnabled = true
      material.sheen.roughness = .04
      material.sheen.intensity = .04

      human.material = material

      water.addToRenderList(human)

      const humanRoot = result[0]

      this.cameraTarget = MeshBuilder.CreateBox('cameraTarget', {
        width: .0125,
        depth: .0125,
        height: .0125
      }, screen.scene)
      this.cameraTarget.position.copyFrom(new Vector3(0, 0, 0))
      this.cameraTarget.parent = this.hero

      this.cameraTarget.isVisible = false
      screen.camera.lockedTarget = this.cameraTarget
      screen.camera.cameraDirection = new Vector3(0, 0, -1)
      screen.camera.rotationOffset = 180

      // Don't need?
      const armature = screen.scene.getNodeByName('Armature')!
      armature.isEnabled(false)

      humanRoot.parent = this.hero
      humanRoot.position.addInPlace(new Vector3(0, -2, 0))

      humanRoot.scaling.scaleInPlace(.480304)

      this.hero.ellipsoid = new Vector3(1, 4, 1)
      this.hero.ellipsoidOffset = new Vector3(0, 2, 0)
      this.hero.checkCollisions = true

      let skelHeadBone: Bone

      human.receiveShadows = true
      shadowGenerator.addShadowCaster(human)

      // Character Customization

      SceneLoader.ImportMesh('', '/assets/', 'hairs-short.glb', screen.scene, hairz => {
        const skel = human.skeleton!
        const head = skel.bones[skel.getBoneIndexByName('mixamorig_HeadTop_End')]
        skelHeadBone = skel.bones[skel.getBoneIndexByName('mixamorig_Head')]
        hairz[1].attachToBone(head, humanRoot)
        hairz[1].position = new Vector3(0, -.2, -.2)
        hairz[1].rotation = new Vector3(-Math.PI / 12, 0, 0)

        screen.overlay.text('Anya of Earth', skelHeadBone, humanRoot, false)

        screen.game.say.subscribe(say => {
          screen.overlay.text(say, skelHeadBone, humanRoot, true)
        })

        const hairMat = new PBRMaterial('hair', screen.scene)
        hairMat.albedoColor = Color3.FromHexString('#1A0C09').toLinearSpace().scale(3)
        hairMat.roughness = .2
        hairMat.metallic = 1
        hairMat.sheen.isEnabled = true
        hairMat.sheen.linkSheenWithAlbedo = true
        hairMat.anisotropy.isEnabled = true
        hairMat.anisotropy.intensity = .8
        hairMat.backFaceCulling = false
        hairz[1].material = hairMat

        hairz[1].receiveShadows = true
        shadowGenerator.addShadowCaster(hairz[1])
      })

      // Character Customization

      SceneLoader.ImportMesh('', '/assets/', 'eyes.glb', screen.scene, hairz => {
        const skel = human.skeleton!
        const head = skel.bones[skel.getBoneIndexByName('mixamorig_HeadTop_End')]
        hairz[1].attachToBone(head, humanRoot)
        hairz[2].attachToBone(head, humanRoot)
        hairz[1].position = new Vector3(0.068, -0.234956, 0.05)
        hairz[1].rotation = new Vector3(-Math.PI / 2 - 0.24, 0.2, 0)
        hairz[2].position = new Vector3(-0.068, -0.234956, 0.05)
        hairz[2].rotation = new Vector3(-Math.PI / 2 - 0.24, -0.2, 0)

        this.cameraTargetMesh = hairz[2] as Mesh
      })
    })
  }

  update() {
    const walkAnim = this.screen.scene.getAnimationGroupByName('Walking')
    const idleAnim = this.screen.scene.getAnimationGroupByName('Idle')
    const sittingAnim = this.screen.scene.getAnimationGroupByName('Sitting')

    let keydown = false, didSit = false

    if (this.input.pressed('w')) {  
        this.hero.moveWithCollisions(this.hero.forward.scaleInPlace(this.heroSpeed))
        keydown = true
    }
    if (this.input.pressed('e')) {  
      this.hero.moveWithCollisions(this.hero.forward.scaleInPlace(this.heroSpeed * 4))
      keydown = true
    }
    if (this.input.pressed('s')) {
        this.hero.moveWithCollisions(this.hero.forward.scaleInPlace(-this.heroSpeedBackwards))
        keydown = true
    }
    if (this.input.pressed('a')) {
        this.hero.rotate(Vector3.Up(), -this.heroRotationSpeed)
        keydown = true
    }
    if (this.input.pressed('d')) {
        this.hero.rotate(Vector3.Up(), this.heroRotationSpeed)
        keydown = true
    }
    if (this.input.pressed('b')) {
        keydown = true
    }
    if (this.input.pressed('r')) {
        didSit = true
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

      if (this.animating && !this.sitting) {
        idleAnim?.start(true, 1, idleAnim.from, idleAnim.to, false)
        this.animating = false
      }
    }

    if (this.water.waterMesh) {
      const ray = new Ray(this.hero.position.add(new Vector3(0, -2.1 + 1, 0)), new Vector3(0, 1, 0))
      const hit = ray.intersectsMesh(this.water.waterMesh as DeepImmutableObject<AbstractMesh>, false)
      
      if (hit.hit) {
        this.hero.moveWithCollisions(new Vector3(0, 16 * hit.distance * this.screen.scene.deltaTime / 1000, 0))
      }
    }

    if (this.water.groundMesh) {
      const ray = new Ray(this.hero.position.add(new Vector3(0, -2.1, 0)), new Vector3(0, 1, 0))
      const hit = ray.intersectsMesh(this.water.groundMesh as DeepImmutableObject<AbstractMesh>, false)

      if (!hit.hit) {
        this.hero.moveWithCollisions(new Vector3(0, -9.81 * this.screen.scene.deltaTime / 1000, 0))
      } else {
        this.hero.position.y = hit.pickedPoint!.y + 2
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
    const [ animating, weights, scene, sitting ] = [
       this.animating, this.weights, this.screen.scene, this.sitting
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

      if (!(animating || sitting) && weights.idle < 1) {
        weights.idle += scene.deltaTime / 1000 * speed
      } else if ((animating || sitting) && weights.idle > 0) {
        weights.idle -= scene.deltaTime / 1000 * speed * 1.5
      }

      weights.walking = Math.min(1, Math.max(0, weights.walking))
      weights.sitting = Math.min(1, Math.max(0, weights.sitting))
      weights.idle = Math.min(1, Math.max(0, weights.idle))
    }

    const walkAnim = this.screen.scene.getAnimationGroupByName('Walking')
    const idleAnim = this.screen.scene.getAnimationGroupByName('Idle')
    const sittingAnim = this.screen.scene.getAnimationGroupByName('Sitting')
    walkAnim?.setWeightForAllAnimatables(weights.walking)
    sittingAnim?.setWeightForAllAnimatables(weights.sitting)
    idleAnim?.setWeightForAllAnimatables(weights.idle)

    if (this.cameraTargetMesh) {
      const offset = new Vector3(0, this.cameraTargetMesh.getBoundingInfo().boundingBox.extendSize.y, 0)
      offset.rotateByQuaternionToRef(this.cameraTargetMesh.absoluteRotationQuaternion, offset) // not correct when rotation
      this.cameraTarget!.position.copyFrom(this.cameraTargetMesh.absolutePosition.add(offset).subtract(this.hero.position))
      this.screen.pipeline.depthOfField.focusDistance = this.cameraTarget!.getDistanceToCamera() * 1000
    }
  }
}
