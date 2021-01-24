import { CascadedShadowGenerator, Color3, Color4, ColorCorrectionPostProcess, DefaultRenderingPipeline, DepthOfFieldEffectBlurLevel, DirectionalLight, DynamicTexture, FollowCamera, FollowCameraMouseWheelInput, FollowCameraPointersInput, FreeCamera, HemisphericLight, Matrix, Mesh, MeshBuilder, Observer, Quaternion, Scalar, Scene, ShaderMaterial, StandardMaterial, Texture, Tools, Vector3, VolumetricLightScatteringPostProcess } from '@babylonjs/core'
import { AdvancedDynamicTexture, Button, Control } from '@babylonjs/gui'
import { GameController } from '../game.controller'
import { InputController } from '../input.controller'
import { getSkyMaterial } from '../materials/sky.material'
import { Screen } from '../models'
import { OverlayController } from '../overlay.controller'
import { PlayerController } from '../player.controller'
import { WaterController } from '../water.controller'
import { WorldController } from '../world.controller'

export class GameScreen implements Screen {
  scene: Scene
  overlayScene: Scene
  overlaySceneCamera: FreeCamera
  input: InputController
  camera: FollowCamera
  pipeline: DefaultRenderingPipeline
  lutPostProcess: ColorCorrectionPostProcess
  godrays: VolumetricLightScatteringPostProcess
  light: DirectionalLight
  shadowGenerator: CascadedShadowGenerator
  ambientLight: HemisphericLight
  skybox: Mesh
  water: WaterController
  world: WorldController
  player: PlayerController
  overlay: OverlayController
  godrayMaterial: StandardMaterial

  gameTime = 0
  sunPosition = new Vector3(0, .5, 1)
  p: PlayerController
  p2: PlayerController

  constructor(public game: GameController) {
    this.scene = new Scene(game.engine)
    this.overlayScene = new Scene(game.engine, { virtual: true })
    this.overlayScene.autoClear = false
    this.overlayScene.clearColor = new Color4(1, 1, 1, 0)
    this.overlaySceneCamera = new FreeCamera('overlaySceneCamera', new Vector3(0, 10, 0), this.overlayScene)
    let overlayPipeline = new DefaultRenderingPipeline('overlayPipeline', false, this.scene, [ this.overlaySceneCamera ])
    overlayPipeline.samples = 4
    
    this.scene.gravity = new Vector3(0, -9.81 / 60, 0)
    this.scene.fogMode = Scene.FOGMODE_EXP
    this.scene.fogStart = 100
    this.scene.fogEnd = 200
    this.scene.fogColor = new Color3(110/255, 158/255, 169/255)
    this.scene.clearColor = new Color4(0, 0, 0)
    this.scene.ambientColor = new Color3(0, 0, 0)

    this.input = new InputController(this.scene)

    this.camera = new FollowCamera('camera', new Vector3(0, 10, 0), this.scene)
    this.camera.attachControl(true)
    this.camera.radius = 10 / 2
    this.camera.heightOffset = 0
    this.camera.lowerHeightOffsetLimit = -1 / 2
    this.camera.upperHeightOffsetLimit = 20 / 2
    this.camera.lowerRadiusLimit = 5 / 2
    this.camera.upperRadiusLimit = 20 / 2
    this.camera.cameraAcceleration = 0.025
    this.camera.rotationOffset = 180
    this.camera.fov = .6
    this.camera.maxZ = 10000
    ;(this.camera.inputs.attached['mousewheel'] as FollowCameraMouseWheelInput).wheelPrecision = 1
    ;(this.camera.inputs.attached['pointers'] as FollowCameraPointersInput).angularSensibilityX = 2
    ;(this.camera.inputs.attached['pointers'] as FollowCameraPointersInput).angularSensibilityY = 2

    this.pipeline = new DefaultRenderingPipeline('defaultPipeline', true, this.scene, [ this.camera ])
    this.pipeline.samples = 4
    this.pipeline.fxaaEnabled = true
    this.pipeline.bloomEnabled = true
    this.pipeline.bloomThreshold = 0.8
    this.pipeline.bloomWeight = 0.25
    this.pipeline.bloomKernel = 64
    this.pipeline.bloomScale = 0.75
    this.pipeline.depthOfFieldEnabled =  true
    this.pipeline.depthOfFieldBlurLevel = DepthOfFieldEffectBlurLevel.Medium
    this.pipeline.depthOfField.focalLength = 85
    this.pipeline.depthOfField.lensSize = 85
    this.pipeline.depthOfField.fStop = 11

    this.lutPostProcess = new ColorCorrectionPostProcess(
      'color_correction',
      'assets/Fuji XTrans III - Classic Chrome.png',
      1.0,
      this.camera
    )
  
    this.godrays = new VolumetricLightScatteringPostProcess(
      'godrays',
      1.0,
      this.camera,
      Mesh.CreateSphere('godrays',
      8,
      20,
      this.scene,
      false),
      80,
      Texture.BILINEAR_SAMPLINGMODE,
      this.game.engine,
      false,
      this.scene
    )
    this.godrays.mesh.applyFog = false
    this.godrays.exposure = 0.1
    this.godrays.decay = 0.96815
    this.godrays.weight = 0.98767
    this.godrays.density = 0.996

    this.godrayMaterial = new StandardMaterial('godrayMaterial', this.scene)
    this.godrayMaterial.emissiveColor = Color3.White()
    this.godrayMaterial.diffuseColor = Color3.Black()
    this.godrays.mesh.material = this.godrayMaterial

    this.light = new DirectionalLight('light', new Vector3(-25, -10, 0).normalize(), this.scene)
    this.light.intensity = 1
    this.light.shadowMinZ = this.camera.minZ
    this.light.shadowMaxZ = this.camera.maxZ
    this.ambientLight = new HemisphericLight('ambientLight', this.light.direction.clone(), this.scene)
    this.ambientLight.intensity = .2

    this.shadowGenerator = new CascadedShadowGenerator(512+256, this.light)
    this.shadowGenerator.lambda = .992
    this.shadowGenerator.transparencyShadow = true
    this.shadowGenerator.enableSoftTransparentShadow = true
    this.shadowGenerator.bias = .001
    this.shadowGenerator.normalBias = .02
    this.shadowGenerator.setDarkness(0.5)
    this.shadowGenerator.stabilizeCascades = true
    this.shadowGenerator.splitFrustum()

    this.skybox = Mesh.CreateSphere('skyBox', 12, 9100, this.scene, false, Mesh.BACKSIDE)
    this.skybox.applyFog = false
    this.skybox.material = getSkyMaterial(this.scene)

    this.godrays.excludedMeshes = [ this.skybox ]

    this.water = new WaterController(this.scene)
    this.water.addToRenderList(this.skybox)

    this.world = new WorldController(this.scene, this.water, this.shadowGenerator, 'peninsula world.glb')

    this.overlay = new OverlayController(this.overlayScene)

    this.player = new PlayerController(
      this.scene,
      this.overlay,
      this.pipeline,
      this.game.say,
      this.camera,
      this.shadowGenerator,
      this.water,
      this.world,
      this.input
    )

    this.p = new PlayerController(
      this.scene,
      this.overlay,
      this.pipeline,
      this.game.say,
      this.camera,
      this.shadowGenerator,
      this.water,
      this.world,
      undefined,
      false,
      false
    )

    this.p.playerName = 'Elizabeth'
    this.p.skinToneIndex = 4
    
    this.p2 = new PlayerController(
      this.scene,
      this.overlay,
      this.pipeline,
      this.game.say,
      this.camera,
      this.shadowGenerator,
      this.water,
      this.world,
      undefined,
      false,
      false
    )

    this.p2.hero.position.addInPlace(new Vector3(-20, 0, -10))
    this.p2.hero.rotation = new Vector3(0, Math.PI, 0)
    this.p2.playerName = 'Gloria'
    
    this.scene.onBeforeRenderObservable.add(() => {
      this.update();
    })

    this.setupUI()
    
    this.overlayScene.onPointerDown = () => {
      const ray = this.overlayScene.createPickingRay(this.scene.pointerX, this.scene.pointerY, Matrix.Identity(), this.overlaySceneCamera)
      const hit = this.overlayScene.pickWithRay(ray)

      if (hit?.pickedMesh?.name === 'talk') {
        hit!.pickedMesh!.metadata?.callback?.()
      }
    }   

    this.scene.onPointerDown = () => {
      const ray = this.scene.createPickingRay(this.scene.pointerX, this.scene.pointerY, Matrix.Identity(), this.camera)
      const hit = this.scene.pickWithRay(ray)

      if (hit?.pickedMesh?.name === 'screenshot') {
        var image = new Image()
        image.src = hit!.pickedMesh!.metadata.data

        // TODO Change to URL eventually...
        const w = window.open('')!
        w.document.write(image.outerHTML)
      }
    }   
  }

  setupUI() {
    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI('UI', true, this.overlayScene)

    const button = Button.CreateSimpleButton('button', 'Camera')
    button.width = '200px'
    button.height = '40px'
    button.color = 'black'
    button.cornerRadius = 20
    button.background = 'white'
    button.onPointerUpObservable.add(() => {
      let func: () => void
      func = () => {
        this.scene.onAfterRenderObservable.removeCallback(func)
        this.screenshot()
      }
      this.scene.onAfterRenderObservable.add(func)
    })
    advancedTexture.addControl(button)

    button.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM
    button.top = '-20px'
  }

  start(): void {
    this.game.music.play('Anya_of_Earth.ogg', this.scene)
  }

  dispose(): void {
    this.scene.dispose()
    this.overlayScene.dispose()
  }

  update(): void {
    this.player.update()
    this.p.update()
    this.p2.update()

    if (this.input.single('l')) {
      if (this.camera.maxCameraSpeed === 0) {
        this.camera.maxCameraSpeed = 20
      } else {
        this.camera.maxCameraSpeed = 0
      }
    }

    if (this.input.single('c')) {
      this.screenshot()
    }

    this.overlaySceneCamera.position = this.camera.position.clone()
    this.overlaySceneCamera.rotation = this.camera.rotation.clone()
    this.overlaySceneCamera.fov = this.camera.fov
    this.overlaySceneCamera.minZ = this.camera.minZ
    this.overlaySceneCamera.maxZ = this.camera.maxZ

    this.gameTime += 0.00002

    this.sunPosition.rotateByQuaternionToRef(new Quaternion(-.0002, 0, 0, this.sunPosition.toQuaternion().w), this.sunPosition)
    this.sunPosition.rotateByQuaternionToRef(new Quaternion(0, -.0001, 0, this.sunPosition.toQuaternion().w), this.sunPosition)

    const howMuchDay = Math.pow(Math.max(0, 0.1 + this.sunPosition.y), .5)

    this.scene.fogDensity = howMuchDay * .003

    this.light.intensity = howMuchDay
    this.light.specular = Color3.White().scale(Math.max(0, Math.min(1, -3.4 + howMuchDay * 8)))
    this.godrayMaterial.emissiveColor = Color3.White().scale(howMuchDay).add(Color3.FromHexString('#FFAA67').toLinearSpace().scale(1 - howMuchDay))
    this.ambientLight.diffuse = Color3.White().scale(howMuchDay).add(Color3.FromHexString('#16228F').toLinearSpace().scale(1 - howMuchDay))
    this.ambientLight.groundColor = this.ambientLight.diffuse.clone().scale(.5)
    this.ambientLight.specular = this.light.specular.scale(.99).add(new Color3(0.01, 0.01, 0.01)) // scale + add to fix bug where specular never shows up again after reaching 0

    this.water.setWaterColor(Color3.FromHexString('#2D7493').scale(Math.max(0, Math.min(1, howMuchDay * 2))))

    this.light.direction = this.sunPosition.negate().normalize()
    this.ambientLight.direction = this.light.direction.clone()
    this.godrays.mesh.position = this.sunPosition.scale(500).add(this.camera.position)

    this.light.position = this.player.hero.position.clone().subtract(this.light.direction.scale(50))

    let shaderMaterial = this.scene.getMaterialByName('skyShader') as ShaderMaterial
    shaderMaterial.setFloat('time', this.gameTime)
    // shaderMaterial.setFloat('offset', gameTime)
    shaderMaterial.setFloat('suny', this.sunPosition.y)
    shaderMaterial.setFloat('sunx', Math.atan2(-this.sunPosition.z, -this.sunPosition.x) / -Math.PI)
  }

  screenshot() {
    Tools.CreateScreenshotUsingRenderTargetAsync(this.camera.getEngine(), this.camera, {
      width: this.scene.getEngine().getRenderWidth(),
      height: this.scene.getEngine().getRenderHeight()
      // width: 1920,
      // height: 1080
    }).then(data => {
      const box = MeshBuilder.CreateBox('screenshot', {
        width: 19.2,
        height: 10.8 
      }, this.scene)

      box.metadata = { data }

      box.position.copyFrom(this.player.hero.position)
      box.position.y += 6
      box.position.x += Scalar.RandomRange(-60, 60)
      box.position.z += Scalar.RandomRange(-60, 60)
      box.lookAt(this.player.hero.position, 0, 0, Math.PI)

      const mat = new StandardMaterial('mat', this.scene)
      mat.diffuseTexture = new Texture(data, this.scene)
      box.material = mat
    })
  }

  render(): void {
    this.scene.render()
    this.overlayScene.render()
  }
}
