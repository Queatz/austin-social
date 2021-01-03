import { Component, ElementRef, HostBinding, HostListener, OnInit, ViewChild } from '@angular/core'
import { AbstractMesh, ActionManager, Animation, CascadedShadowGenerator, Color3, Color4, ColorCorrectionPostProcess, DeepImmutableObject, DefaultRenderingPipeline, DepthOfFieldEffectBlurLevel, DirectionalLight, DynamicTexture, EasingFunction, Engine, ExecuteCodeAction, FollowCamera, HemisphericLight, InstancedMesh, Light, Material, Mesh, MeshBuilder, NodeMaterial, PBRBaseSimpleMaterial, PBRMaterial, PowerEase, Ray, ReflectionProbe, Scalar, Scene, SceneLoader, ShadowGenerator, SolidParticleSystem, Sound, Space, StandardMaterial, Texture, TonemappingOperator, TonemapPostProcess, Vector2, Vector3, VertexBuffer, VolumetricLightScatteringPostProcess } from '@babylonjs/core'
import { SkyMaterial, WaterMaterial } from '@babylonjs/materials'

import '@babylonjs/loaders/glTF'
import '@babylonjs/core/Physics/Plugins/cannonJSPlugin'
import { Subject } from 'rxjs'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  @ViewChild('renderCanvas', { static: true, read: ElementRef })
  renderCanvas!: ElementRef
  
  say = new Subject<string>()

  @HostListener('window:keydown.enter')
  talk(): void {
    const result = prompt('hey')
    
    if (result) {
      this.say.next(result)
    }
  }

  ngOnInit(): void {
    const showColliders = false

    const engine = new Engine(this.renderCanvas.nativeElement, true)
    const scene = new Scene(engine)

    var music = new Sound("Music", "assets/Anya_of_Earth.ogg", scene, null, {
      loop: true,
      autoplay: true,
      volume: .5
    });

    scene.gravity = new Vector3(0, -9.81 / 60, 0)
    scene.fogMode = Scene.FOGMODE_EXP
    scene.fogStart = 100
    scene.fogEnd = 200
    scene.fogColor = new Color3(110/255, 158/255, 169/255)
    scene.clearColor = new Color4(0, 0, 0)
    scene.ambientColor = new Color3(0, 0, 0)

    // Keyboard events
    const inputMap: any = {}
    scene.actionManager = new ActionManager(scene)
    scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, function (evt) {
        inputMap[evt.sourceEvent.key] = evt.sourceEvent.type == "keydown"
    }))
    scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, function (evt) {
        inputMap[evt.sourceEvent.key] = evt.sourceEvent.type == "keydown"
    }))

    const camera = new FollowCamera("camera", new Vector3(0, 10, 0), scene)
    camera.attachControl(true)
    camera.radius = 10 / 2
    camera.heightOffset = 0
    camera.lowerHeightOffsetLimit = -1 / 2
    camera.upperHeightOffsetLimit = 20 / 2
    camera.lowerRadiusLimit = 5 / 2
    camera.upperRadiusLimit = 20 / 2
    camera.cameraAcceleration = 0.025
    camera.rotationOffset = 180

    camera.fov = .6
    camera.maxZ = 10000

    let pipeline = new DefaultRenderingPipeline("defaultPipeline", true, scene, [ camera ])

    pipeline.samples = 4
    pipeline.fxaaEnabled = true

    pipeline.bloomEnabled = true
    pipeline.bloomThreshold = 0.8
    pipeline.bloomWeight = 0.25
    pipeline.bloomKernel = 64
    pipeline.bloomScale = 0.75

    pipeline.depthOfFieldEnabled =  true
    pipeline.depthOfFieldBlurLevel = DepthOfFieldEffectBlurLevel.Medium
    pipeline.depthOfField.focalLength = 85
    pipeline.depthOfField.lensSize = 85
    pipeline.depthOfField.fStop = 11

    const lutPostProcess = new ColorCorrectionPostProcess("color_correction", 'assets/Fuji XTrans III - Classic Chrome.png', 1.0, camera)

    // pipeline.imageProcessing.colorCurvesEnabled = true
    // const colorCurves = pipeline.imageProcessing.colorCurves!
    // colorCurves.globalSaturation = 50
    // colorCurves.globalExposure = 50


    // const ssao = new SSAORenderingPipeline('ssaopipeline', scene, 1, [ camera ]);
    // ssao.fallOff = 0.0000005

    const light = new DirectionalLight("light", new Vector3(-25, -10, 0).normalize(), scene)
    light.intensity = 2
    light.shadowMinZ = camera.minZ
    light.shadowMaxZ = camera.maxZ
    const ambientLight = new HemisphericLight("ambientLight", light.direction.clone(), scene)
    ambientLight.intensity = .4

    const shadowGenerator = new CascadedShadowGenerator(512, light)
    shadowGenerator.lambda = .99;
    shadowGenerator.transparencyShadow = true
    shadowGenerator.enableSoftTransparentShadow = true
    shadowGenerator.bias = .001
    shadowGenerator.normalBias = .02
    shadowGenerator.setDarkness(0.5)
    shadowGenerator.stabilizeCascades = true
    // shadowGenerator.debug = true
    shadowGenerator.splitFrustum()

    let ground!: AbstractMesh, water!: AbstractMesh, waterMaterial!: WaterMaterial

    // Game State

    let timeOfDay = 0

    // Sky Material
    const skyMaterial = new SkyMaterial('skyMaterial', scene)
    skyMaterial.backFaceCulling = false
    skyMaterial.turbidity = 1.7
    skyMaterial.luminance = 1 // Between 0 and 1.190
    skyMaterial.rayleigh = 1
    skyMaterial.mieDirectionalG = 0.1
    skyMaterial.mieCoefficient = 0.02
    skyMaterial.useSunPosition = false
    skyMaterial.inclination = -0.45
    skyMaterial.azimuth = 0.25

    // Stars

    const starMaterial = new StandardMaterial("stars", scene)
    starMaterial.diffuseColor = Color3.Black()
    starMaterial.specularColor = Color3.Black()

    const starTexture = new Texture('assets/stars.jpeg', scene)
    starMaterial.emissiveTexture = starTexture


    // Skybox
    const skybox = Mesh.CreateSphere('skyBox', 12, 9100, scene, false, Mesh.BACKSIDE)
    skybox.applyFog = false
    skybox.material = skyMaterial

    // Starbox
    let starbox = Mesh.CreateSphere('starBox', 12, 9000, scene, false, Mesh.BACKSIDE)
    starbox.applyFog = false
    starbox.rotate(new Vector3(0, 0, 1), -0.3926991)
    starbox.material = starMaterial
    starbox.alphaIndex = -1

    // Godrays

    const godrays = new VolumetricLightScatteringPostProcess('godrays', 1.0, camera, Mesh.CreateSphere('godrays', 8, 20, scene, false), 80, Texture.BILINEAR_SAMPLINGMODE, engine, false, scene)
    godrays.mesh.applyFog = false
    godrays.exposure = 0.1;
    godrays.decay = 0.96815;
    godrays.weight = 0.98767;
    godrays.density = 0.996;
    
    const godrayMaterial = new StandardMaterial("godrayMaterial", scene)
    godrayMaterial.emissiveColor = Color3.White()
    godrayMaterial.diffuseColor = Color3.Black()
    godrays.mesh.material = godrayMaterial
    godrays.excludedMeshes = [ skybox, starbox ]


    // Ground
    const groundTexture = new Texture('assets/sand.jpg', scene)
    groundTexture.vScale = groundTexture.uScale = 10.0

    const groundMaterial = new StandardMaterial('groundMaterial', scene)
    groundMaterial.specularColor = Color3.Black()
    groundMaterial.diffuseTexture = groundTexture

    const groundMesh = Mesh.CreateGround('ground', 1024, 1024, 32, scene, false)
    groundMesh.position.y = -4
    groundMesh.material = groundMaterial
    groundMesh.receiveShadows = true

    //Water
    water = Mesh.CreateGround('waterMesh', 1024, 1024, 64, scene, false)

    waterMaterial = new WaterMaterial('water', scene, new Vector2(512, 512))
    waterMaterial.backFaceCulling = true
    const waterBump = new Texture('assets/waterbump.png', scene)
    waterBump.uScale = waterBump.vScale = 6
    waterMaterial.bumpTexture = waterBump
    waterMaterial.windForce = -2
    waterMaterial.waveHeight = .02
    waterMaterial.bumpHeight = .7
    waterMaterial.waveLength = .1
    waterMaterial.waveSpeed = 50
    waterMaterial.bumpSuperimpose = true
    waterMaterial.waterColor = Color3.FromHexString('#2D7493')
    waterMaterial.colorBlendFactor = .3
    waterMaterial.colorBlendFactor2 = .9
    waterMaterial.addToRenderList(skybox)
    waterMaterial.addToRenderList(starbox)
    waterMaterial.addToRenderList(groundMesh)
    waterMaterial.alpha = .94
    waterMaterial.specularColor = Color3.White()
    waterMaterial.specularPower = 256
    waterMaterial.bumpAffectsReflection = true
    waterMaterial.backFaceCulling = false
    water.material = waterMaterial
    water.alphaIndex = 0

    let rootTree!: Mesh

    SceneLoader.ImportMesh('', '/assets/', 'peninsula world.glb', scene, result => {
      ground = scene.getMeshByName('Peninsula')!

      const groundMaterial = new PBRMaterial("pbr", scene)
      groundMaterial.metallic = 0
      groundMaterial.roughness = 1
      const texture = new Texture("assets/peninsula sand.png", scene)
      texture.uScale = texture.vScale = 120
      groundMaterial.albedoTexture = texture
      groundMaterial.specularIntensity = 0.1

      const grassBump = new Texture('assets/grass_path_2_nor_1k.png', scene)
      grassBump.uScale = grassBump.vScale = 50
      grassBump.level = .5
      groundMaterial.bumpTexture = grassBump

      ground.material = groundMaterial
      ground.receiveShadows = true
      ground.checkCollisions = true
      ground.useVertexColors = false
      ground.hasVertexAlpha = false // because we use vertex colors

      this.addGrasses(ground as Mesh, shadowGenerator)
      
      const treeMaterial = scene.getMaterialByName('Tree01')!
      treeMaterial.backFaceCulling = false
      treeMaterial.transparencyMode = Material.MATERIAL_ALPHATESTANDBLEND;
      ;(treeMaterial as StandardMaterial).diffuseTexture = (treeMaterial! as StandardMaterial).emissiveTexture;
      ;(treeMaterial as StandardMaterial).diffuseColor = Color3.White().scale(4);
      ;(treeMaterial as StandardMaterial).emissiveTexture = null;
      ;(treeMaterial as StandardMaterial).emissiveColor = Color3.Black();
      ;(treeMaterial as StandardMaterial).specularColor = Color3.Black();
      ;(treeMaterial as StandardMaterial).useAlphaFromDiffuseTexture = true;

      result.forEach(mesh => {
        // Gazeb0
        if (mesh.name === 'Plane.005') {
          mesh.receiveShadows = true
          shadowGenerator.addShadowCaster(mesh)
        }

        if (mesh.name.indexOf('Bench') !== -1) {
          mesh.checkCollisions = true
        }

        if (mesh.name.indexOf('Tree') !== -1) {
          shadowGenerator.addShadowCaster(mesh)
          if ((mesh instanceof InstancedMesh)) {
            // Convert instance to clone
            const instance = (mesh as InstancedMesh)//.sourceMesh;
            const clone = instance.sourceMesh.clone("clonedTree")
            clone.receiveShadows = true;
            clone.position = instance.position
            clone.rotation = instance.rotation
            clone.rotationQuaternion = instance.rotationQuaternion
            clone.scaling = instance.scaling
            instance.dispose()
          } else {
            ;(mesh as Mesh).receiveShadows = true;
            rootTree = mesh as Mesh
          }

          // console.log(mesh.material!.needAlphaBlending())
          // mesh.material!.needAlphaBlendingForMesh(mesh)
        }
      })

      // BUG
      //waterMaterial.addToRenderList(ground)
    })

    // SceneLoader.ImportMesh('', '/assets/', 'tree.glb', scene, result => {
    //   const tree = result[1]
    //   tree.position.addInPlace(new Vector3(6, 3.5, 1))

    //   const collider = MeshBuilder.CreateBox('collider', {
    //     height: 4,
    //     width: 1,
    //     depth: 1
    //   }, scene)
    //   collider.isVisible = showColliders
    //   collider.position = new Vector3(-6, -2, 1)
    //   collider.checkCollisions = true
    //   tree.receiveShadows = true
    //   tree.material!.transparencyMode = Material.MATERIAL_ALPHATESTANDBLEND;
    //   (tree.material! as StandardMaterial).diffuseTexture = (tree.material! as StandardMaterial).emissiveTexture;
    //   (tree.material! as StandardMaterial).emissiveTexture = null;
    //   (tree.material! as StandardMaterial).emissiveColor = Color3.Black();
    //   (tree.material! as StandardMaterial).useAlphaFromDiffuseTexture = true;
    //   shadowGenerator.addShadowCaster(tree)
    // })

    // SceneLoader.ImportMesh('', '/assets/', 'tree.glb', scene, result => {
    //   const tree = result[1]
    //   tree.position.addInPlace(new Vector3(5, 3.5, 6))

    //   const collider = MeshBuilder.CreateBox('collider', {
    //     height: 4,
    //     width: 1,
    //     depth: 1
    //   }, scene)
    //   collider.isVisible = showColliders
    //   collider.position = new Vector3(-5, -2, 6)
    //   collider.checkCollisions = true
    //   tree.receiveShadows = true
    //   tree.material!.transparencyMode = Material.MATERIAL_ALPHATESTANDBLEND;
    //   (tree.material! as StandardMaterial).diffuseTexture = (tree.material! as StandardMaterial).emissiveTexture;
    //   (tree.material! as StandardMaterial).emissiveTexture = null;
    //   (tree.material! as StandardMaterial).emissiveColor = Color3.Black();
    //   (tree.material! as StandardMaterial).useAlphaFromDiffuseTexture = true;
    //   shadowGenerator.addShadowCaster(tree)
    // })

    SceneLoader.ImportMesh('', '/assets/', 'human.glb', scene, result => {
      const human = scene.getMeshByName('Human_Cube')!

      // scene.enableSubSurfaceForPrePass()!.metersPerUnit = 1;
      // scene.prePassRenderer!.samples = 4;

      const material = new PBRMaterial("pbr", scene)
      // material.albedoColor = new Color3(1, 1, 1)
      material.albedoColor = Color3.FromHexString("#F5BC88").toLinearSpace() // F5BC88 // 4F2F1C // FFC6C0
      material.metallic = 0
      material.roughness = .6
      material.sheen.isEnabled = true
      material.sheen.roughness = .04
      material.sheen.intensity = .04
      // material.reflectionTexture = new Texture('assets/Human_skin_001_SPEC.jpg', scene)
      // ;(material.reflectionTexture as Texture).uScale = 7;
      // ;(material.reflectionTexture as Texture).vScale = 7;
      // material.bumpTexture = new Texture('assets/Human_skin_001_NRM.jpg', scene)
      // ;(material.bumpTexture as Texture).uScale = 7;
      // ;(material.bumpTexture as Texture).vScale = 7;
      // ;(material.bumpTexture as Texture).level = 1;
      // material.albedoTexture = new Texture('assets/Human_skin_001_COLOR.jpg', scene)
      // ;(material.albedoTexture as Texture).uScale = 7;
      // ;(material.albedoTexture as Texture).vScale = 7;
      // material.subSurface.isScatteringEnabled = true
      // material.subSurface.minimumThickness = .03
      // material.subSurface.tintColor = Color3.FromHexString("#883616").toLinearSpace()

      const rp = new ReflectionProbe('ref', 128, scene);
      rp.renderList!.push(skybox);

      material.reflectivityTexture = rp.cubeTexture
      human.material = material

      waterMaterial.addToRenderList(human)

      const heroSpeed = .1
      const heroSpeedBackwards = .1
      const heroRotationSpeed = Math.PI / 180 * 5

      const walkingSound = new Sound("sound", "assets/walk.ogg", scene);

      let animating = true

      const weights = {
        idle: 1,
        walking: 0,
        sitting: 0
      }

      const walkAnim = scene.getAnimationGroupByName('Walking')!
      const idleAnim = scene.getAnimationGroupByName("Idle")!
      const sittingAnim = scene.getAnimationGroupByName("Sitting")!

      const hero = MeshBuilder.CreateBox('hero', {
        width: .5,
        depth: .5,
        height: .5
      }, scene)

      hero.ellipsoid = new Vector3(.5, .5, .5)

      hero.isVisible = showColliders

      const humanRoot = result[0]

      const cameraTarget = MeshBuilder.CreateBox('cameraTarget', {
        width: .5,
        depth: .5,
        height: .5
      }, scene)
      cameraTarget.position.copyFrom(new Vector3(0, 0, 0))

      cameraTarget.isVisible = showColliders
      camera.lockedTarget = cameraTarget
      camera.cameraDirection = new Vector3(0, 0, -1)
      camera.rotationOffset = 180

      // Don't need?
      const armature = scene.getNodeByName('Armature')!
      armature.isEnabled(false)

      // SceneLoader.LoadAssetContainer('/assets/', 'pose-sitting.glb', scene, container => {
      //   console.log(container.animationGroups)
      //     container.animationGroups.forEach(x => {
      //       if (x.name = 'Walking') {
      //         x.name = 'PoseSitting'
      //         idleAnim = x
      //         hero.skeleton
      //         scene.addAnimationGroup(idleAnim)
      //         idleAnim.start(true, 1, idleAnim.from, idleAnim.to, false)
      //         idleAnim.setWeightForAllAnimatables(1)
      //       }
      //     })
      // })

      humanRoot.parent = hero
      humanRoot.position.addInPlace(new Vector3(0, -2, 0))

      humanRoot.scaling.scaleInPlace(.480304)

      hero.ellipsoid = new Vector3(1, 4, 1)
      hero.ellipsoidOffset = new Vector3(0, 2, 0)
      hero.checkCollisions = true

      this.genPlayerName('Anya of Earth', hero, scene, false)

      this.say.subscribe(say => {
        this.genPlayerName(say, hero, scene, true)
      })

      human.receiveShadows = true
      shadowGenerator.addShadowCaster(human)

      SceneLoader.ImportMesh('', '/assets/', 'hairs-short.glb', scene, hairz => {
        const skel = human.skeleton!
        const head = skel.bones[skel.getBoneIndexByName('mixamorig_HeadTop_End')]
        hairz[1].attachToBone(head, humanRoot)
        hairz[1].position = new Vector3(0, -.2, -.2)
        hairz[1].rotation = new Vector3(-Math.PI / 12, 0, 0)

        const hairMat = new PBRMaterial('hair', scene)
        hairMat.albedoColor = Color3.FromHexString("#1A0C09").toLinearSpace().scale(3)
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

      SceneLoader.ImportMesh('', '/assets/', 'eyes.glb', scene, hairz => {
        const skel = human.skeleton!
        const head = skel.bones[skel.getBoneIndexByName('mixamorig_HeadTop_End')]
        hairz[1].attachToBone(head, humanRoot)
        hairz[2].attachToBone(head, humanRoot)
        hairz[1].position = new Vector3(0.068, -0.234956, 0.05)
        hairz[1].rotation = new Vector3(-Math.PI / 2 - 0.24, 0.2, 0)
        hairz[2].position = new Vector3(-0.068, -0.234956, 0.05)
        hairz[2].rotation = new Vector3(-Math.PI / 2 - 0.24, -0.2, 0)

        cameraTarget.parent = hairz[2]
      })

      // SceneLoader.LoadAssetContainer('/assets/', 'shirt.glb', scene, assets => {
      //   const shirt = assets.meshes[1]

      //   scene.addMesh(shirt)

      //   shadowGenerator.addShadowCaster(shirt)

      //   shirt.parent = humanRoot
      //   human.parent = humanRoot
      //   shirt.skeleton = human.skeleton

      //   // shirt.position.addInPlace(new Vector3(0, -2.2, 0))

      //   shirt.skeleton!.overrideMesh = null

      //   shirt.receiveShadows = true
      //   shadowGenerator.addShadowCaster(shirt)
      // })

      let sitting = false

      //Rendering loop (executed for everyframe)
      scene.onBeforeRenderObservable.add(() => {
        let keydown = false, didSit = false
        //Manage the movements of the character (e.g. position, direction)
        if (inputMap["w"]) {  
            hero.moveWithCollisions(hero.forward.scaleInPlace(heroSpeed))
            keydown = true
        }
        if (inputMap["e"]) {  
          hero.moveWithCollisions(hero.forward.scaleInPlace(heroSpeed * 10))
          keydown = true
        }
        if (inputMap["s"]) {
            hero.moveWithCollisions(hero.forward.scaleInPlace(-heroSpeedBackwards))
            keydown = true
        }
        if (inputMap["a"]) {
            hero.rotate(Vector3.Up(), -heroRotationSpeed)
            cameraTarget.rotate(Vector3.Up(), -heroRotationSpeed) // TODO remove after updating to Alpha 6
            keydown = true
        }
        if (inputMap["d"]) {
            hero.rotate(Vector3.Up(), heroRotationSpeed)
            cameraTarget.rotate(Vector3.Up(), heroRotationSpeed) // TODO remove after updating to Alpha 6
            keydown = true
        }
        if (inputMap["b"]) {
            keydown = true
        }
        if (inputMap["r"]) {
            didSit = true
        }

        const fovEase = new PowerEase()
        fovEase.setEasingMode(EasingFunction.EASINGMODE_EASEOUT)

        if (keydown) {
          if (!walkingSound.isPlaying) {
            walkingSound.loop = true
            walkingSound.play()
          }
            if (sitting) {
              sitting = false
              Animation.CreateAndStartAnimation("fov anim", camera, "fov", 60, 30, camera.fov, .6, 0, fovEase)
              shadowGenerator.splitFrustum()
            }

            if (!animating) {
                animating = true
                walkAnim.start(true, 1, walkAnim.from, walkAnim.to, false)
            }
        }
        else {
          if (walkingSound.isPlaying) {
            walkingSound.stop()
          }
          if (didSit) {
            if (sitting && weights.sitting === 1) {
              sitting = false
              animating = true

              Animation.CreateAndStartAnimation("fov anim", camera, "fov", 60, 30, camera.fov, .6, 0, fovEase)
              shadowGenerator.splitFrustum()
            } else if (!sitting && weights.sitting === 0) {
              sittingAnim.start(true, 1, sittingAnim.from, sittingAnim.to, false)
              sitting = true
              animating = false

              Animation.CreateAndStartAnimation("fov anim", camera, "fov", 60, 30, camera.fov, .4, 0, fovEase)
              shadowGenerator.splitFrustum()
            }
          }

          if (animating && !sitting) {
            idleAnim.start(true, 1, idleAnim.from, idleAnim.to, false)
            animating = false
          }
        }

        if (ground) {
          const ray = new Ray(hero.position.add(new Vector3(0, -2.1, 0)), new Vector3(0, 1, 0))
          const hit = ray.intersectsMesh(ground as DeepImmutableObject<AbstractMesh>, false)

          if (!hit.hit) {
            hero.moveWithCollisions(new Vector3(0, -9.81 * scene.deltaTime / 1000, 0))
          } else {
            hero.position.y = hit.pickedPoint!.y + 2
          }
        }

        if (water) {
          const ray = new Ray(camera.position, new Vector3(0, 1, 0))
          const hit = ray.intersectsMesh(water as DeepImmutableObject<AbstractMesh>, false)
          
          if (hit.hit && !pipeline.imageProcessing.colorCurvesEnabled) {
            const colorCurves = pipeline.imageProcessing.colorCurves!
            colorCurves.globalHue = 210
            colorCurves.globalDensity = 100
            colorCurves.globalExposure = -100
            pipeline.imageProcessing.colorCurvesEnabled = true
          } else if (!hit.hit && pipeline.imageProcessing.colorCurvesEnabled) {
            pipeline.imageProcessing.colorCurvesEnabled = false
        }
        }

        const speed = 4
        
        if (scene.deltaTime) {
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

        walkAnim.setWeightForAllAnimatables(weights.walking)
        sittingAnim.setWeightForAllAnimatables(weights.sitting)
        idleAnim.setWeightForAllAnimatables(weights.idle)

        skyMaterial.inclination += 0.0001

        if (skyMaterial.inclination > 1) {
          skyMaterial.inclination = -1
        }

        const howMuchDay = Math.pow(Math.max(0, 0.1 + (0.5 - Math.abs(skyMaterial.inclination))) * 2, .5)

        scene.fogDensity = howMuchDay * .003

        light.intensity = 2 * howMuchDay
        light.specular = Color3.White().scale(Math.max(0, Math.min(1, -3.4 + howMuchDay * 8)))
        ambientLight.diffuse = Color3.White().scale(howMuchDay).add(Color3.FromHexString('#16228F').scale(1 - howMuchDay))
        ambientLight.specular = light.specular.scale(.99).add(new Color3(0.01, 0.01, 0.01)) // scale + add to fix bug where specular never shows up again after reaching 0
        ambientLight.intensity = Math.max(0.2, howMuchDay)

        waterMaterial.waterColor = Color3.FromHexString('#2D7493').scale(Math.max(0, Math.min(1, howMuchDay * 2)))

        starbox.visibility = 1 - Math.min(1, howMuchDay * 2.4)
        starbox.rotate(new Vector3(0, 1, 0), -0.0001, Space.LOCAL)

        light.direction = skyMaterial.sunPosition.negate().normalize()
        ambientLight.direction = light.direction.clone()
        godrays.mesh.position = skyMaterial.sunPosition.add(camera.position)
        
        light.position = hero.position.clone().subtract(light.direction.scale(50))

        pipeline.depthOfField.focusDistance = 1000 * hero.getDistanceToCamera()
        pipeline.depthOfField.fStop = 1.2 + (1 - weights.sitting) * (11 - 1.2)

        rootTree?.updateFacetData()
      })
    })

    engine.runRenderLoop(() => {
      scene.render()
    })

    window.addEventListener('resize', () => {
      engine.resize()
    })
  }
  genPlayerName(text: string, hero: Mesh, scene: Scene, vanish: boolean) {
    //Set font
    var font_size = 48;
    var font = "normal " + font_size + "px Arial";
    
    //Set height for plane
    var planeHeight = .125;

    //Set height for dynamic texture
    var DTHeight = 1.5 * font_size; //or set as wished

    //Calcultae ratio
    var ratio = planeHeight/DTHeight;

    //Use a temporay dynamic texture to calculate the length of the text on the dynamic texture canvas
    var temp = new DynamicTexture("DynamicTexture", 64, scene, false)
    var tmpctx = temp.getContext()
    tmpctx.font = font
    var DTWidth = tmpctx.measureText(text).width + 8

    //Calculate width the plane has to be 
    var planeWidth = DTWidth * ratio

    //Create dynamic texture and write the text
    var dynamicTexture = new DynamicTexture("DynamicTexture", {width:DTWidth, height:DTHeight}, scene, false)
    var mat = new StandardMaterial("mat", scene)
    mat.diffuseTexture = dynamicTexture
    mat.diffuseTexture.hasAlpha = true
    mat.emissiveTexture = dynamicTexture
    dynamicTexture.drawText(text, null, null, font, vanish ? "#000000" : "#ffffff", vanish ? "#ffffff" : "#ffffff00")
    mat.useAlphaFromDiffuseTexture = true
    mat.disableLighting = true

    //Create plane and set dynamic texture as material
    var plane = MeshBuilder.CreatePlane("plane", {width:planeWidth, height:planeHeight}, scene)
    plane.material = mat
    plane.billboardMode = Mesh.BILLBOARDMODE_ALL

    if (vanish) {
      setTimeout(() => {
        plane.dispose(false, true)
      }, 5000);
      plane.position.addInPlace(new Vector3(0, .25, 0))
    } else {
      plane.position.addInPlace(new Vector3(0, .5, 0))
    }
    plane.parent = hero
  }

  addGrasses(ground: Mesh, shadowGenerator: ShadowGenerator): void {
    SceneLoader.LoadAssetContainer('assets/', 'grass.glb', ground.getScene(), meshes => {
      const positions = ground.getVerticesData(VertexBuffer.PositionKind)!
      const colors = ground.getVerticesData(VertexBuffer.ColorKind)!
      const count = ground.getTotalVertices()
      const indices = ground.getIndices()!

      const grassMesh = meshes.meshes.find(x => x.name === 'GrassPatch01') as Mesh

      const tex = new Texture('assets/grass.png', ground.getScene())
      // tex.uScale = -1
      tex.vScale = -1

      const grassMat = new PBRMaterial("grass", ground.getScene())
      grassMat.albedoColor = Color3.White()
      grassMat.albedoTexture = tex
      grassMat.roughness = 1
      grassMat.metallic = 0
      grassMat.specularIntensity = 0
      grassMat.albedoTexture.hasAlpha = true
      grassMat.useAlphaFromAlbedoTexture = true
      grassMat.transparencyMode = Material.MATERIAL_ALPHATEST
      grassMat.backFaceCulling = false
      grassMesh.material = grassMat

      const SPS = new SolidParticleSystem("SPS", ground.getScene(), {
        useModelMaterial: true
      })
      SPS.addShape(grassMesh, count)
      meshes.dispose() 
      const mesh = SPS.buildMesh()

      mesh.position = ground.position
      mesh.rotation = ground.rotation
      mesh.rotationQuaternion = ground.rotationQuaternion
      mesh.parent = ground.parent

      SPS.initParticles = () => {
          for (let p = 0; p < count; p++) {
              const particle = SPS.particles[p]  
              particle.position = Vector3.FromArray(positions, p * 3)//.addInPlace(ground.position)
          
              const scale = colors[p * 4] > .25 ? 1/25 : 0
              particle.scale.x = scale
              particle.scale.y = scale * 5
              particle.scale.z = scale
          }
      }

      SPS.isAlwaysVisible = true
      SPS.initParticles()
      SPS.setParticles()

      shadowGenerator.addShadowCaster(SPS.mesh)
    })
  }
}
