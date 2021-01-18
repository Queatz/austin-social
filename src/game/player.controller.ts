import { AbstractMesh, Animation, CascadedShadowGenerator, Color3, DeepImmutableObject, EasingFunction, FollowCamera, Mesh, MeshBuilder, MorphTarget, PBRMaterial, PowerEase, Ray, Scalar, Scene, SceneLoader, Sound, DefaultRenderingPipeline, Vector3, Bone, AnimationGroup } from '@babylonjs/core'
import { Observable } from 'rxjs'
import { InputController } from './input.controller'
import { OverlayController } from './overlay.controller'
import { WaterController } from './water.controller'
import { WorldController } from './world.controller'

export class PlayerController {
  skinToneIndex = 0
  skinTones = [
    '#4F2F1C',
    '#7C492B',
    '#C1836C',
    '#F5BC88',
    '#F0AFAF',
    '#F4BAB8',
    '#FFC6C0',
  ]
  activeApparelColor?: Color3
  hairColor?: Color3

  playerName = 'Anya of Earth'

  sitting = false
  posing = false
  hero: Mesh

  humanRoot!: Mesh
  skelHeadBone!: Bone

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

  animationGroups = {} as { [key: string]: AnimationGroup }

  smile = 0
  smileTarget = 0

  cameraTargetMesh?: Mesh
  cameraTarget?: Mesh

  humanScale = .480304
  heroSize = .5
  smileMorph?: MorphTarget
  smileMorphLips?: MorphTarget
  humanMaterial!: PBRMaterial
  playerNameMesh?: Mesh
  activeApparelMesh?: AbstractMesh
  hairMesh: AbstractMesh | undefined

  constructor(
    private scene: Scene,
    private overlay: OverlayController | null,
    private pipeline: DefaultRenderingPipeline | null,
    private sayObservable: Observable<string> | null,
    private camera: FollowCamera,
    private shadowGenerator: CascadedShadowGenerator,
    private water: WaterController,
    private world: WorldController,
    private input?: InputController,
    private startBehind = true,
    private attachToCamera = true,
    private showName = true
  ) {
    this.walkingSound = new Sound('sound', 'assets/walk.ogg', scene)
    
    this.hero = MeshBuilder.CreateBox('hero', {
      size: this.heroSize
    }, scene)

    this.hero.checkCollisions = true
    this.hero.ellipsoid = new Vector3(1, 4, 1)
    this.hero.ellipsoidOffset = new Vector3(0, 4, 0)
    this.hero.isVisible = false

    this.walkingSound.attachToMesh(this.hero)

    SceneLoader.ImportMesh('', '/assets/', 'human.glb', scene, (meshes, particleSystems, skeletons, animationGroups) => {
      const human = meshes.find(x => x.name === 'Human_primitive0') as Mesh

      this.humanMaterial = new PBRMaterial('pbr', scene)
      this.humanMaterial.albedoColor = Color3.FromHexString(this.skinTones[this.skinToneIndex]).toLinearSpace()
      this.humanMaterial.metallic = 0
      this.humanMaterial.roughness = .7
      this.humanMaterial.directIntensity = 1.6
      this.humanMaterial.clearCoat.isEnabled = true
      this.humanMaterial.clearCoat.intensity = .2
      this.humanMaterial.clearCoat.roughness = .4
      human.material = this.humanMaterial

      this.activeApparelMesh = meshes.find(x => x.name === 'Dress')
      this.hairMesh = meshes.find(x => x.name === 'Short Hair')

      if (this.activeApparelColor) {
        this.setActiveApparelColor(this.activeApparelColor)
      }

      if (this.hairColor) {
        this.setHairColor(this.hairColor)
      }

      const eyeL = meshes.find(x => x.name === 'Eye L') as Mesh
      const eyeR = meshes.find(x => x.name === 'Eyes R') as Mesh

      eyeL.rotation = new Vector3(-Math.PI / 2, 0.1, 0)
      eyeR.rotation = new Vector3(-Math.PI / 2, -0.1, 0)

      water.addToRenderList(human)

      if (this.attachToCamera) {
        this.cameraTargetMesh = meshes.find(x => x.name === 'Eye L') as Mesh
      }

      [
        meshes.find(x => x.name === 'Human_primitive0') as Mesh,
        meshes.find(x => x.name === 'Human_primitive1') as Mesh,
        meshes.find(x => x.name === 'Human_primitive2') as Mesh
      ].forEach(mesh => {
        mesh.hasVertexAlpha = false
        mesh.onBeforeRenderObservable.add(() => {
          mesh.refreshBoundingInfo(true)
        })
      })

      const morphTargetIndex = 4
      this.smileMorph = human.morphTargetManager!.getTarget(morphTargetIndex)
      this.smileMorphLips = (meshes.find(x => x.name === 'Human_primitive1') as Mesh).morphTargetManager!.getTarget(morphTargetIndex)

      this.animationGroups['walk'] = animationGroups.find(x => x.name === 'Walking')!
      this.animationGroups['idle'] = animationGroups.find(x => x.name === 'Idle')!
      this.animationGroups['sitting'] = animationGroups.find(x => x.name === 'Sitting')!
      this.animationGroups['pose'] = animationGroups.find(x => x.name === 'Pose')!

      this.humanRoot = meshes.find(x => x.name === '__root__') as Mesh

      if (this.attachToCamera) {
        this.cameraTarget = MeshBuilder.CreateBox('cameraTarget', {
          width: .0125,
          depth: .0125,
          height: .0125
        }, scene)

        this.cameraTarget.isVisible = false
        camera.lockedTarget = this.cameraTarget
        camera.cameraDirection = new Vector3(0, 0, startBehind ? -1 : 1)
        camera.rotationOffset = startBehind ? 180 : 45
      }

      this.humanRoot.parent = this.hero
      this.humanRoot.position.copyFrom(new Vector3(0, .84, 0))

      this.humanRoot.scaling.scaleInPlace(this.humanScale)

      human.receiveShadows = true
      shadowGenerator.addShadowCaster(human)

      const skel = human.skeleton!
      const head = skel.bones[skel.getBoneIndexByName('Head')]
      this.skelHeadBone = skel.bones[skel.getBoneIndexByName('Head')]

      this.setPlayerName(this.playerName)

      sayObservable?.subscribe(say => {
        overlay?.text(say, this.skelHeadBone, this.humanRoot, true)
      })  

      // Character Customization

      // SceneLoader.ImportMesh('', '/assets/', 'hairs-short.glb', scene, hairz => {
      //   hairz[1].attachToBone(head, humanRoot)
      //   hairz[1].position = new Vector3(0, .3, -.1)
      //   hairz[1].rotation = new Vector3(-Math.PI / 12, 0, 0)

      //   const hairMat = new PBRMaterial('hair', scene)
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

      // SceneLoader.ImportMesh('', '/assets/', 'eyes.glb', scene, hairz => {
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

    // Fix jittery camera when player is animating

    if (this.attachToCamera) {
      this.scene.onAfterActiveMeshesEvaluationObservable.add(() => {
        this.updateCamera();
      })
    }
  }

  setActiveApparelColor(value: Color3) {
    this.activeApparelColor = value
    
    const mat = this.activeApparelMesh?.material as PBRMaterial
    mat?.albedoColor?.copyFrom(value)
  }

  getActiveApparelColor(): Color3 | undefined {
    return (this.activeApparelMesh?.material as PBRMaterial)?.albedoColor
  }

  setHairColor(value: Color3) {
    this.hairColor = value
    
    const mat = this.hairMesh?.material as PBRMaterial
    mat?.albedoColor?.copyFrom(value)
  }

  getHairColor(): Color3 | undefined {
    return (this.hairMesh?.material as PBRMaterial)?.albedoColor
  }

  toggleSkinTone() {
    this.skinToneIndex = Scalar.Repeat(this.skinToneIndex + 1, this.skinTones.length)
    this.humanMaterial.albedoColor = Color3.FromHexString(this.skinTones[this.skinToneIndex]).toLinearSpace()
  }

  setPlayerName(playerName: string) {
    this.playerName = playerName

    if (this.showName) {
      this.playerNameMesh?.dispose(false, true)
      this.playerNameMesh = this.overlay?.text(this.playerName, this.skelHeadBone, this.humanRoot, false)
    }
  }

  randomize() {
    this.skinToneIndex = Math.trunc(Scalar.RandomRange(0, this.skinTones.length))
  }

  update() {
    let keydown = false, didSit = false, didPose = false

    if (this.input) {
      if (this.input.pressed('w')) {  
        this.hero.moveWithCollisions(this.hero.forward.scaleInPlace(this.heroSpeed * this.scene.deltaTime))
        keydown = true
      }
      if (this.input.pressed('e')) {  
        this.hero.moveWithCollisions(this.hero.forward.scaleInPlace(this.heroSpeed * 4 * this.scene.deltaTime))
        keydown = true
      }
      if (this.input.pressed('s')) {
          this.hero.moveWithCollisions(this.hero.forward.scaleInPlace(-this.heroSpeedBackwards * this.scene.deltaTime))
          keydown = true
      }
      if (this.input.pressed('a')) {
          this.hero.rotate(Vector3.Up(), -this.heroRotationSpeed * this.scene.deltaTime)
          keydown = true
      }
      if (this.input.pressed('d')) {
          this.hero.rotate(Vector3.Up(), this.heroRotationSpeed * this.scene.deltaTime)
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

          if (this.attachToCamera) {
            Animation.CreateAndStartAnimation('fov anim', this.camera, 'fov', 60, 30, this.camera.fov, .6, 0, fovEase)
            this.shadowGenerator.splitFrustum()
          }
        }

        if (!this.animating) {
          this.animating = true
          this.animationGroups['walk']?.start(true, 1, this.animationGroups['walk'].from, this.animationGroups['walk'].to, false)
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

          if (this.attachToCamera) {
            Animation.CreateAndStartAnimation('fov anim', this.camera, 'fov', 60, 30, this.camera.fov, .6, 0, fovEase)
            this.shadowGenerator.splitFrustum()
          }
        } else if (!this.sitting && this.weights.sitting === 0) {
          this.animationGroups['sitting']?.start(true, 1, this.animationGroups['sitting'].from, this.animationGroups['sitting'].to, false)
          this.sitting = true
          this.animating = false

          if (this.attachToCamera) {
            Animation.CreateAndStartAnimation('fov anim', this.camera, 'fov', 60, 30, this.camera.fov, .4, 0, fovEase)
            this.shadowGenerator.splitFrustum()
          }
        }
      }

      if (didPose) {
        if (this.posing && this.weights.pose === 1) {
          this.posing = false
          this.animating = true
        } else if (!this.posing && this.weights.pose === 0) {
          this.animationGroups['pose']?.start(true, 1, this.animationGroups['pose']!.to, this.animationGroups['pose']!.to, false)
          this.posing = true
          this.animating = false
        }
      }

      if (this.animating && !this.sitting && !this.posing) {
        this.animationGroups['idle']?.start(true, 1, this.animationGroups['idle'].from, this.animationGroups['idle'].to, false)
        this.animating = false
      }
    }

    if (this.water.waterMesh) {
      const ray = new Ray(this.hero.position.add(new Vector3(0, -.1 + 1 - this.heroSize / 2, 0)), new Vector3(0, 1, 0))
      const hit = ray.intersectsMesh(this.water.waterMesh as DeepImmutableObject<AbstractMesh>, false)
      
      if (hit.hit) {
        this.hero.moveWithCollisions(new Vector3(0, 16 * hit.distance * this.scene.deltaTime / 1000, 0))
      }
    }

    if (this.world.ground) {
      const ray = new Ray(this.hero.position.add(new Vector3(0, -.1 - this.heroSize / 2, 0)), new Vector3(0, 1, 0))
      const hit = ray.intersectsMesh(this.world.ground as DeepImmutableObject<AbstractMesh>, false)

      if (!hit.hit) {
        this.hero.moveWithCollisions(new Vector3(0, -9.81 * this.scene.deltaTime / 1000, 0))
      } else {
        this.hero.position.y = hit.pickedPoint!.y + this.heroSize / 2
      }
    }

    // TODO probably does not belong in player controller
    if (this.attachToCamera && this.water.waterMesh) {
      const ray = new Ray(this.camera.position, new Vector3(0, 1, 0))
      const hit = ray.intersectsMesh(this.water.waterMesh as DeepImmutableObject<AbstractMesh>, false)
      
      if (hit.hit && !this.isUnderwater()) {
        this.setUnderwater(true)
      } else if (!hit.hit && this.isUnderwater()) {
        this.setUnderwater(false)
      }
    }

    this.updateAnimations()

    if (this.attachToCamera && this.pipeline) {
      this.pipeline.depthOfField.fStop = 1.2 + (1 - this.weights.sitting) * (11 - 1.2)
    }
  }

  updateAnimations() {
    const [ animating, weights, scene, sitting, posing ] = [
       this.animating, this.weights, this.scene, this.sitting, this.posing
    ]

    const speed = 4
    
    if (this.scene.deltaTime) {
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

    this.animationGroups['walk']?.setWeightForAllAnimatables(weights.walking)
    this.animationGroups['sitting']?.setWeightForAllAnimatables(weights.sitting)
    this.animationGroups['idle']?.setWeightForAllAnimatables(weights.idle)
    this.animationGroups['pose']?.setWeightForAllAnimatables(weights.pose)

    if (this.smile !== this.smileTarget) {
      this.smile += 0.005 * this.scene.deltaTime * (this.smile < this.smileTarget ? 1 : -1)
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

      if (this.pipeline?.depthOfField) {
        this.pipeline.depthOfField.focusDistance = this.cameraTarget!.getDistanceToCamera() * 1000
      }
    }
  }

  isUnderwater() {
    return this.pipeline?.imageProcessing.colorCurvesEnabled
  }

  setUnderwater(isUnder: boolean) {
    if (!this.pipeline) {
      return
    }

    if (isUnder) {
      const colorCurves = this.pipeline.imageProcessing.colorCurves!
      colorCurves.globalHue = 210
      colorCurves.globalDensity = 100
      colorCurves.globalExposure = -100
      this.pipeline.imageProcessing.colorCurvesEnabled = true
    } else {
      this.pipeline.imageProcessing.colorCurvesEnabled = false
    }
  }
}
