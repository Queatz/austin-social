import { Component, ElementRef, OnInit, ViewChild } from '@angular/core'
import { AbstractMesh, ActionManager, Animation, BounceEase, CascadedShadowGenerator, Color3, Color4, ColorCorrectionPostProcess, CubicEase, DeepImmutableObject, DefaultRenderingPipeline, DepthOfFieldEffectBlurLevel, DirectionalLight, EasingFunction, Engine, ExecuteCodeAction, FollowCamera, HemisphericLight, Light, Material, Mesh, MeshBuilder, NodeMaterial, PBRBaseSimpleMaterial, PBRMaterial, PBRMetallicRoughnessMaterial, PBRSpecularGlossinessMaterial, PowerEase, QuarticEase, Ray, ReflectionProbe, Scene, SceneLoader, Space, SSAORenderingPipeline, StandardMaterial, Texture, Vector2, Vector3, VolumetricLightScatteringPostProcess } from '@babylonjs/core'
import { SkyMaterial, WaterMaterial } from '@babylonjs/materials'

import '@babylonjs/loaders/glTF'
import '@babylonjs/core/Physics/Plugins/cannonJSPlugin'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  @ViewChild('renderCanvas', { static: true, read: ElementRef })
  renderCanvas!: ElementRef

  ngOnInit(): void {
    const showColliders = false

    const engine = new Engine(this.renderCanvas.nativeElement, true)
    const scene = new Scene(engine)

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
    camera.radius = 10
    camera.heightOffset = 0
    camera.lowerHeightOffsetLimit = -1
    camera.upperHeightOffsetLimit = 20
    camera.lowerRadiusLimit = 5
    camera.upperRadiusLimit = 20
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


    const postProcess = new ColorCorrectionPostProcess("color_correction", 'assets/Fuji XTrans III - Classic Chrome.png', 1.0, camera)

    // pipeline.imageProcessing.colorCurvesEnabled = true

    // const colorCurves = new ColorCurves()
    // colorCurves.midtonesExposure = 25
    // colorCurves.midtonesSaturation = 50
    // colorCurves.highlightsExposure = 25
    // colorCurves.highlightsSaturation = 25
    // pipeline.imageProcessing.colorCurves = colorCurves

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
    skyMaterial.inclination = -0.6
    skyMaterial.azimuth = 0.25

    // Stars

    const starMaterial = new StandardMaterial("stars", scene)
    starMaterial.diffuseColor = Color3.Black()
    starMaterial.specularColor = Color3.Black()

    const starTexture = new Texture('assets/stars.jpeg', scene)
    starMaterial.emissiveTexture = starTexture


    // Skybox
    const skybox = Mesh.CreateSphere('skyBox', 12, 500, scene, false, Mesh.BACKSIDE)
    skybox.applyFog = false
    skybox.material = skyMaterial

    // Starbox
    let starbox = Mesh.CreateSphere('starBox', 12, 490, scene, false, Mesh.BACKSIDE)
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

    const groundMesh = Mesh.CreateGround('ground', 512, 512, 32, scene, false)
    groundMesh.position.y = -4
    groundMesh.material = groundMaterial
    groundMesh.receiveShadows = true

    //Water
    water = Mesh.CreateGround('waterMesh', 512, 512, 64, scene, false)

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
    water.material = waterMaterial
    water.position.addInPlace(new Vector3(0, -3, 0))
    water.alphaIndex = 0

    SceneLoader.ImportMesh('', '/assets/', 'ground.glb', scene, result => {
      ground = result[1]

      const groundMaterial = new PBRMetallicRoughnessMaterial("pbr", scene)
      groundMaterial.metallic = 2
      groundMaterial.roughness = 1.4
      const texture = new Texture("assets/grass_03.png", scene)
      texture.uScale = texture.vScale = 50
      groundMaterial.baseTexture = texture

      const grassBump = new Texture('assets/grass_path_2_nor_1k.png', scene)
      grassBump.uScale = grassBump.vScale = 50
      grassBump.level = .5
      groundMaterial.normalTexture = grassBump

      ground.material = groundMaterial
      ground.position.addInPlace(new Vector3(0, -3, 0))
      ground.receiveShadows = true
      ground.checkCollisions = true

      // BUG
      //waterMaterial.addToRenderList(ground)
    })

    SceneLoader.ImportMesh('', '/assets/', 'tree.glb', scene, result => {
      const tree = result[1]
      tree.position.addInPlace(new Vector3(6, 3.5, 1))

      const collider = MeshBuilder.CreateBox('collider', {
        height: 4,
        width: 1,
        depth: 1
      }, scene)
      collider.isVisible = showColliders
      collider.position = new Vector3(-6, -2, 1)
      collider.checkCollisions = true
      tree.receiveShadows = true
      tree.material!.transparencyMode = Material.MATERIAL_ALPHATESTANDBLEND;
      (tree.material! as StandardMaterial).diffuseTexture = (tree.material! as StandardMaterial).emissiveTexture;
      (tree.material! as StandardMaterial).emissiveTexture = null;
      (tree.material! as StandardMaterial).emissiveColor = Color3.Black();
      (tree.material! as StandardMaterial).useAlphaFromDiffuseTexture = true;
      shadowGenerator.addShadowCaster(tree)
    })

    SceneLoader.ImportMesh('', '/assets/', 'tree.glb', scene, result => {
      const tree = result[1]
      tree.position.addInPlace(new Vector3(5, 3.5, 6))

      const collider = MeshBuilder.CreateBox('collider', {
        height: 4,
        width: 1,
        depth: 1
      }, scene)
      collider.isVisible = showColliders
      collider.position = new Vector3(-5, -2, 6)
      collider.checkCollisions = true
      tree.receiveShadows = true
      tree.material!.transparencyMode = Material.MATERIAL_ALPHATESTANDBLEND;
      (tree.material! as StandardMaterial).diffuseTexture = (tree.material! as StandardMaterial).emissiveTexture;
      (tree.material! as StandardMaterial).emissiveTexture = null;
      (tree.material! as StandardMaterial).emissiveColor = Color3.Black();
      (tree.material! as StandardMaterial).useAlphaFromDiffuseTexture = true;
      shadowGenerator.addShadowCaster(tree)
    })

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
        width: 1,
        depth: 1,
        height: 4
      }, scene)

      hero.position.addInPlace(new Vector3(0, 2, 0))

      hero.isVisible = showColliders

      const humanRoot = result[0]

      const cameraTarget = MeshBuilder.CreateBox('cameraTarget', {
        width: .5,
        depth: .5,
        height: .5
      }, scene)
      cameraTarget.position.copyFrom(new Vector3(0, 1, 0))

      cameraTarget.isVisible = showColliders
      cameraTarget.parent = hero
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

      hero.ellipsoid = new Vector3(1, 4, 1)
      hero.ellipsoidOffset = new Vector3(0, 2, 0)
      hero.checkCollisions = true

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
        hairz[3].attachToBone(head, humanRoot)
        hairz[1].position = new Vector3(0.062789, -0.234956, 0.05)
        hairz[1].rotation = new Vector3(Math.PI / 2, 0, 0)
        hairz[3].position = new Vector3(-0.062789, -0.234956, 0.05)
        hairz[3].rotation = new Vector3(Math.PI / 2, 0, 0)
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
            if (sitting) {
              sitting = false
              cameraTarget.position.copyFrom(new Vector3(0, 1, 0))
              Animation.CreateAndStartAnimation("position.y", cameraTarget, "position.y", 60, 30, cameraTarget.position.y, 1, 0, fovEase)
              Animation.CreateAndStartAnimation("fov anim", camera, "fov", 60, 30, camera.fov, .6, 0, fovEase)
              shadowGenerator.splitFrustum()
            }

            if (!animating) {
                animating = true
                walkAnim.start(true, 1, walkAnim.from, walkAnim.to, false)
            }
        }
        else {
          if (didSit) {
            if (sitting && weights.sitting === 1) {
              sitting = false
              animating = true

              Animation.CreateAndStartAnimation("position.y", cameraTarget, "position.y", 60, 30, cameraTarget.position.y, 1, 0, fovEase)
              Animation.CreateAndStartAnimation("fov anim", camera, "fov", 60, 30, camera.fov, .6, 0, fovEase)
              shadowGenerator.splitFrustum()
            } else if (!sitting && weights.sitting === 0) {
              sittingAnim.start(true, 1, sittingAnim.from, sittingAnim.to, false)
              sitting = true
              animating = false

              Animation.CreateAndStartAnimation("position.y", cameraTarget, "position.y", 60, 30, cameraTarget.position.y, 0, 0, fovEase)
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
        ambientLight.intensity = Math.max(0.05, howMuchDay)
        ambientLight.diffuse = Color3.White().scale(howMuchDay).add(Color3.FromHexString('#16228F').scale(1 - howMuchDay))

        waterMaterial.waterColor = Color3.FromHexString('#2D7493').scale(Math.max(0, Math.min(1, howMuchDay * 2)))

        starbox.visibility = 1 - Math.min(1, howMuchDay * 2.4)
        starbox.rotate(new Vector3(0, 1, 0), -0.0001, Space.LOCAL)

        light.direction = skyMaterial.sunPosition.negate().normalize()
        ambientLight.direction = light.direction.clone()
        godrays.mesh.position = skyMaterial.sunPosition.add(camera.position)
        
        light.position = hero.position.clone().subtract(light.direction.scale(50))

        pipeline.depthOfField.focusDistance = 1000 * hero.getDistanceToCamera()
        pipeline.depthOfField.fStop = 1.2 + (1 - weights.sitting) * (11 - 1.2)
      })
    })

    engine.runRenderLoop(() => {
      scene.render()
    })

    window.addEventListener('resize', () => {
      engine.resize()
    })
  }
}
