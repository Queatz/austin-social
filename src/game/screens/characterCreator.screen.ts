import { CascadedShadowGenerator, Color3, Color4, ColorCorrectionPostProcess, DefaultRenderingPipeline, DepthOfFieldEffectBlurLevel, DirectionalLight, FollowCamera, FreeCamera, HemisphericLight, Mesh, Scene, Vector3 } from '@babylonjs/core'
import { AdvancedDynamicTexture, Button, ColorPicker, Control, Image, InputText, Rectangle } from '@babylonjs/gui'
import { GameController } from '../game.controller'
import { InputController } from '../input.controller'
import { Screen } from '../models'
import { OverlayController } from '../overlay.controller'
import { PlayerController } from '../player.controller'
import { WaterController } from '../water.controller'
import { WorldController } from '../world.controller'
import { GameScreen } from './game.screen'

export class CharacterCreatorScreen implements Screen {
  scene: Scene
  water: WaterController
  player: PlayerController
  camera: FollowCamera
  light: DirectionalLight
  shadowGenerator: any
  input: InputController
  world: WorldController
  ambientLight: HemisphericLight
  pipeline: any
  lutPostProcess: any
  overlayScene: Scene
  overlaySceneCamera: FreeCamera
  overlay: OverlayController
  skybox: Mesh

  constructor(public game: GameController) {
    this.scene = new Scene(game.engine)
    this.scene.clearColor = new Color4(.1, .03, .04, 1)
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
    this.scene.fogDensity = .008
    this.scene.fogColor = Color3.FromHexString('#5A99B9')
    this.scene.clearColor = new Color4(0, 0, 0)
    this.scene.ambientColor = new Color3(0, 0, 0)
    
    this.setupUI(this.overlayScene)

    this.camera = new FollowCamera('camera', new Vector3(0, 6, 0), this.scene)
    this.camera.attachControl(true)
    this.camera.radius = 10 / 2
    this.camera.heightOffset = 0
    this.camera.lowerHeightOffsetLimit = -1 / 2
    this.camera.upperHeightOffsetLimit = 20 / 2
    this.camera.lowerRadiusLimit = 5 / 2
    this.camera.upperRadiusLimit = 20 / 2
    this.camera.cameraAcceleration = 0.025
    this.camera.rotationOffset = 45
    this.camera.fov = .6
    this.camera.maxZ = 10000
    
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

    this.light = new DirectionalLight('light', new Vector3(-25, -10, 0).normalize(), this.scene)
    this.light.intensity = 1
    this.light.shadowMinZ = this.camera.minZ
    this.light.shadowMaxZ = this.camera.maxZ
    this.ambientLight = new HemisphericLight('ambientLight', this.light.direction.clone(), this.scene)
    this.ambientLight.intensity = .2

    this.skybox = Mesh.CreateSphere('skyBox', 12, 9100, this.scene, false, Mesh.BACKSIDE)
    
    this.shadowGenerator = new CascadedShadowGenerator(512, this.light)
    this.shadowGenerator.lambda = .99
    this.shadowGenerator.transparencyShadow = true
    this.shadowGenerator.enableSoftTransparentShadow = true
    this.shadowGenerator.bias = .001
    this.shadowGenerator.normalBias = .02
    this.shadowGenerator.setDarkness(0.667)
    this.shadowGenerator.stabilizeCascades = true
    this.shadowGenerator.splitFrustum()

    this.input = new InputController(this.scene)
    this.overlay = new OverlayController(this.overlayScene)

    this.world = new WorldController(this.scene, this.shadowGenerator, 'peninsula world.glb')
    
    this.water = new WaterController(this.scene)
    this.player = new PlayerController(
      this.scene,
      this.overlay,
      this.pipeline,
      this.game.say,
      this.camera,
      this.shadowGenerator,
      this.water,
      this.world,
      this.input,
      false,
      true,
      false
    )

    this.player.randomize()
    
    this.scene.onBeforeRenderObservable.add(() => {
      this.update()
    })
  }

  setupUI(overlayScene: Scene) {
    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI('UI', true, overlayScene)

    this.addButton(advancedTexture, 'Start Playing', () => {
      const gameScreen = new GameScreen(this.game)
      gameScreen.player.skinToneIndex = this.player.skinToneIndex
      gameScreen.player.playerName = this.player.playerName
      gameScreen.player.activeApparelColor = this.player.getActiveApparelColor()
      gameScreen.player.hairColor = this.player.getHairColor()
      this.game.screen.show(gameScreen)
    }).top = advancedTexture.getSize().height / 2 - 40
    
    this.addButton(advancedTexture, 'Skin Tone', () => {
      this.player.toggleSkinTone()
    }).left = advancedTexture.getSize().width / 2 - 120

    const rInput = new Rectangle('rInput')
    rInput.width = '200px'
    rInput.height = '50px'
    rInput.thickness = 1
    rInput.color = 'black'
    rInput.cornerRadius = 15
    rInput.top = -advancedTexture.getSize().height / 2 + 40

    const input = new InputText()
    input.height = 1
    input.width = 1
    input.text = 'Anya of Earth'
    input.color = 'white'
    input.thickness = 0
    input.autoStretchWidth = false
    input.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
    input.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER
    input.isPointerBlocker = true
    input.background = 'rgba(255, 255, 255, .125)'
    input.focusedBackground = 'rgba(255, 255, 255, .25)'

    input.onTextChangedObservable.add(input => {
      this.player.setPlayerName(input.text)
    })

    advancedTexture.addControl(rInput)
    rInput.addControl(input)

    var picker = new ColorPicker()
    picker.value = new Color3()
    picker.height = '150px'
    picker.width = '150px'
    picker.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT
    picker.left = '-20px'
    picker.top = '150px'
    picker.onValueChangedObservable.add(value => {
        this.player.setActiveApparelColor(value)
    })

    advancedTexture.addControl(picker)

    var picker = new ColorPicker()
    picker.value = new Color3()
    picker.height = '150px'
    picker.width = '150px'
    picker.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT
    picker.left = '-20px'
    picker.top = '300px'
    picker.onValueChangedObservable.add(value => {
        this.player.setHairColor(value)
    })

    advancedTexture.addControl(picker)
  }

  private addButton(advancedTexture: AdvancedDynamicTexture, text: string, callback: () => void) {
    const button = Button.CreateSimpleButton('button', text)
    button.width = '200px'
    button.height = '40px'
    button.color = 'black'
    button.cornerRadius = 20
    button.background = 'white'
    button.onPointerUpObservable.add(() => callback())
    advancedTexture.addControl(button)

    return button
  }

  start(): void {
  }

  update(): void {
    this.overlaySceneCamera.position = this.camera.position.clone()
    this.overlaySceneCamera.rotation = this.camera.rotation.clone()
    this.overlaySceneCamera.fov = this.camera.fov
    this.overlaySceneCamera.minZ = this.camera.minZ
    this.overlaySceneCamera.maxZ = this.camera.maxZ
    this.player.update()
  }

  render(): void {
    this.scene.render()
    this.overlayScene.render()
  }

  dispose(): void {
    this.scene.dispose()
    this.overlayScene.dispose()
  }
}