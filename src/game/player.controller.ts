import { AbstractMesh, Animation, CascadedShadowGenerator, Color3, DeepImmutableObject, EasingFunction, FollowCamera, Mesh, MeshBuilder, MorphTarget, PBRMaterial, PowerEase, Ray, Scalar, Scene, SceneLoader, Sound, DefaultRenderingPipeline, Vector3, Bone, AnimationGroup, Texture, Space, Matrix, Quaternion, Vector2 } from '@babylonjs/core'
import { Observable } from 'rxjs'
import { InputController } from './input.controller'
import { OverlayController } from './overlay.controller'
import { WaterController } from './water.controller'
import { WorldController } from './world.controller'

class Morphie {
  value = 0
  target = 0
  targets = new Array<MorphTarget>()
}

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

  playerConfig = {
    hairName: 'hair1',
    apparelName: 'bra1',
    faceName: ''
  }

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

  morphNames = [ 'Boob', 'Boob2', 'Male', 'Male2' ]
  activeMorph = this.morphNames[0]
  activeMorphInitialInfluence = 0
  morphs = {} as { [key: string]: Morphie }

  cameraTargetMesh?: Mesh
  cameraTarget?: Mesh

  humanScale = .480304
  heroSize = .5
  humanMaterial!: PBRMaterial
  playerNameMesh?: Mesh
  activeApparelMesh?: Mesh
  hairMesh?: Mesh
  humanMesh?: Mesh
  armature?: Mesh

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
      const human = this.humanMesh = meshes.find(x => x.name === 'Human_primitive0') as Mesh

      this.humanMaterial = new PBRMaterial('pbr', scene)
      this.humanMaterial.albedoColor = Color3.FromHexString(this.skinTones[this.skinToneIndex]).toLinearSpace()
      this.humanMaterial.metallic = 0
      this.humanMaterial.roughness = .7
      this.humanMaterial.directIntensity = 3
      this.humanMaterial.clearCoat.isEnabled = true
      this.humanMaterial.clearCoat.intensity = .2
      this.humanMaterial.clearCoat.roughness = .4
      human.material = this.humanMaterial

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

      // human.morphTargetManager!.enableUVMorphing = false
      // human.morphTargetManager!.enableNormalMorphing = false
      // human.morphTargetManager!.enableTangentMorphing = false

      this.addMorphieMesh(human)
      this.addMorphieMesh(meshes.find(x => x.name === 'Human_primitive1') as Mesh)

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

      this.armature = meshes.find(x => x.name === 'Armature') as Mesh

      human.receiveShadows = true
      shadowGenerator.addShadowCaster(human)

      const skel = human.skeleton!
      this.skelHeadBone = skel.bones[skel.getBoneIndexByName('Head')]

      this.setPlayerName(this.playerName)

      if (this.attachToCamera) {
        sayObservable?.subscribe(say => {
          overlay?.text(say, this.skelHeadBone, human, true)
        })
      } else {
        overlay?.showInteractions('Hey, stranger! what can I do for you?', [
          [ '🥮 Bake me a cake', () => { overlay?.text('ok!', this.skelHeadBone, human, true) } ],
          [ '🗳 Hang on to some items', () => { overlay?.text('sure thing', this.skelHeadBone, human, true) } ],
          [ '🤗 Hug me sis!', () => { overlay?.text('HUGGGG!!', this.skelHeadBone, human, true) } ]
        ], this.skelHeadBone, human, true)
      }

      // Apparel + Style

      if (this.playerConfig.apparelName) {
        this.setApparel(this.playerConfig.apparelName)
      }

      if (this.playerConfig.hairName) {
        this.setHair(this.playerConfig.hairName)
      }

      if (this.playerConfig.faceName) {
        this.setFace(this.playerConfig.faceName)
      }
    })

    // Fix jittery camera when player is animating

    if (this.attachToCamera) {
      this.scene.onAfterActiveMeshesEvaluationObservable.add(() => {
        this.updateCamera();
      })
    }
  }

  addMorphieMesh(mesh: Mesh) {
    this.morphNames.forEach(morphName => {
      if (!(morphName in this.morphs)) {
        this.morphs[morphName] = new Morphie()
      }

      for(let idx = 0; idx < (mesh.morphTargetManager?.numTargets || 0); idx++) {
        const target = mesh.morphTargetManager!.getTarget(idx)

        if (target.name === morphName) {
          this.morphs[morphName].targets.push(target)

          if (this.activeMorph === target.name && this.activeMorphInitialInfluence > 0) {
            this.morphs[morphName].target = this.morphs[morphName].value = this.activeMorphInitialInfluence
          }
        }
      }
    })
  }

  removeMorphieMesh(mesh: Mesh) {
    this.morphNames.forEach(morphName => {
      // if (morphName in this.morphs) {
      //   this.morphs[morphName].targets = this.morphs[morphName].targets.filter(x => mesh.morphTargetManager?.getActiveTarget)
      // }

      // for(let idx = 0; idx < (mesh.morphTargetManager?.numTargets || 0); idx++) {
      //   const target = mesh.morphTargetManager!.getTarget(idx)

      //   if (target.name === morphName) {
      //     this.morphs[morphName].targets.push(target)

      //     if (this.activeMorph === target.name && this.activeMorphInitialInfluence > 0) {
      //       this.morphs[morphName].target = this.morphs[morphName].value = this.activeMorphInitialInfluence
      //     }
      //   }
      // }
    })
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

  toggleBodyType() {
    if (this.morphs[this.activeMorph]?.value === 0) {
      this.morphs[this.activeMorph]!.target = 1
    } else if (this.morphs[this.activeMorph]?.value === 1) {
      this.morphs[this.activeMorph]!.target = 0

      if (this.activeMorph === 'Male2') {
        this.activeMorph = 'Boob';
      } else if (this.activeMorph === 'Male') {
        this.activeMorph = 'Male2';
        this.morphs[this.activeMorph]!.target = 1
      } else if (this.activeMorph === 'Boob2') {
        this.activeMorph = 'Male';
        this.morphs[this.activeMorph]!.target = 1
      } else if (this.activeMorph === 'Boob') {
        this.activeMorph = 'Boob2';
        this.morphs[this.activeMorph]!.target = 1
      }
    }
  }

  toggleFace() {
    const faces = [
      '',
      'Face.Asian'
    ]

    const idx = faces.indexOf(this.playerConfig.faceName)

    this.setFace(faces[Scalar.Repeat(idx + 1, faces.length)])
  }

  toggleHair() {
    const styles = [
      'hair1',
      'hair2',
      'hair3'
    ]

    const idx = styles.indexOf(this.playerConfig.hairName)

    this.setHair(styles[Scalar.Repeat(idx + 1, styles.length)])
  }

  toggleApparel() {
    const closet = [
      'bra1',
      'dress1',
      'dress2'
    ]

    const idx = closet.indexOf(this.playerConfig.apparelName)

    this.setApparel(closet[Scalar.Repeat(idx + 1, closet.length)])
  }

  setFace(name: string) {
    this.playerConfig.faceName = name

    for(let idx = 0; idx < (this.humanMesh?.morphTargetManager?.numTargets || 0); idx++) {
      const target = this.humanMesh!.morphTargetManager!.getTarget(idx)

      if (target.name === this.playerConfig.faceName) {
        target.influence = 1
      } else if (target.name.startsWith('Face.')) {
        target.influence = 0
      }
    }
  }

  setHair(name: string) {
    this.playerConfig.hairName = name

    if (this.hairMesh) {
      this.hairMesh.dispose()
      this.removeMorphieMesh(this.hairMesh)
      this.hairMesh = undefined
    }

    if (this.humanMesh && this.playerConfig.hairName) {
      SceneLoader.ImportMesh('', '/assets/', `${this.playerConfig.hairName}.glb`, this.scene, meshes => {
        const mesh = meshes.find(x => x.name === 'Hair') as Mesh || meshes.find(x => x.name === 'Short Hair') as Mesh

        // Hair is modelled in world space -- attach to bone and negate rest transform of bone

        let temp = this.humanMesh!.skeleton!.clone('temp')
        temp.returnToRest()
        let head = temp.bones[temp.getBoneIndexByName('Head')]

        mesh.position.subtractInPlace(head.getAbsoluteTransform().getTranslation())
        mesh.setPivotPoint(mesh.position.negate())
        mesh.rotationQuaternion!.copyFrom(Quaternion.FromRotationMatrix(head.getAbsoluteTransform().getRotationMatrix().invert()))

        temp.dispose()

        mesh.attachToBone(this.skelHeadBone, this.humanRoot)

        this.addMorphieMesh(mesh)

        mesh.receiveShadows = true
        this.shadowGenerator.addShadowCaster(mesh)
        this.water.addToRenderList(mesh)

        this.hairMesh = mesh

        const material = mesh!.material as PBRMaterial

        material.directIntensity = 4
        material.metallicReflectanceColor = (mesh!.material as PBRMaterial).albedoColor
        material.anisotropy.isEnabled = true

        const waterBump = new Texture('assets/waterbump.png', this.scene)
        waterBump.uScale = 8
        waterBump.vScale = 1
        material.bumpTexture = waterBump

        if (this.hairColor) {
          this.setHairColor(this.hairColor)
        }
      })
    }
  }

  setApparel(name: string) {
    this.playerConfig.apparelName = name

    if (this.activeApparelMesh) {
      this.activeApparelMesh.dispose()
      this.removeMorphieMesh(this.activeApparelMesh)
      this.activeApparelMesh = undefined
    }

    if (this.humanMesh && this.playerConfig.apparelName) {
      SceneLoader.ImportMesh('', '/assets/', `${this.playerConfig.apparelName}.glb`, this.scene, meshes => {
        const dress = meshes.find(x => x.name === 'Dress') as Mesh || meshes.find(x => x.name === 'Bra') as Mesh

        dress.parent = this.humanMesh!.parent
        dress.skeleton = this.humanMesh!.skeleton
        this.addMorphieMesh(dress)

        dress.receiveShadows = true
        this.shadowGenerator.addShadowCaster(dress)
        this.water.addToRenderList(dress)

        this.activeApparelMesh = dress

        const material = dress!.material as PBRMaterial

        material.directIntensity = 6
        material.metallicReflectanceColor = (dress!.material as PBRMaterial).albedoColor
        material.sheen.isEnabled = true
        material.sheen.roughness = .1
        material.sheen.intensity = .25

        const waterBump = new Texture('assets/waterbump.png', this.scene)
        waterBump.uScale = 1
        waterBump.vScale = 16
        material.bumpTexture = waterBump

        if (this.activeApparelColor) {
          this.setActiveApparelColor(this.activeApparelColor)
        }
      })
    }
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
        // If not any are animating...
        if (!Object.values(this.morphs).map(x => x.value !== 1 && x.value !== 0).reduce((a, b) => a || b)) {
          this.toggleBodyType()
        }
      }
      if (this.input.single('y')) {
        this.activeApparelMesh!.isVisible = !this.activeApparelMesh!.isVisible
      }
    }

    const fovEase = new PowerEase()
    fovEase.setEasingMode(EasingFunction.EASINGMODE_EASEOUT)

    if (keydown) {
      if (!this.walkingSound.isPlaying) {
        this.walkingSound.loop = true
        this.walkingSound.play()
      }

      if (this.posing) {
        this.posing = false
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

    Object.values(this.morphs).forEach(morphie => {
      if (morphie.value !== morphie.target) {
        morphie.value += 0.005 * this.scene.deltaTime * (morphie.value < morphie.target ? 1 : -1)
        morphie.value = Scalar.Clamp(morphie.value, 0, 1)
      }
  
      const smileEase = new PowerEase(2)
      smileEase.setEasingMode(EasingFunction.EASINGMODE_EASEIN)
      const influence = smileEase.ease(morphie.value)

      morphie.targets.forEach(morph => {
        morph.influence = influence
      })
    })
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
