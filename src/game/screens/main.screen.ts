import { ArcRotateCamera, Color4, Scene, Vector3 } from '@babylonjs/core'
import { AdvancedDynamicTexture, Button, Image, TextBlock } from '@babylonjs/gui'
import { GameController } from '../game.controller'
import { Screen } from '../models'
import { CharacterCreatorScreen } from './characterCreator.screen'
import { GameScreen } from './game.screen'

export class MainScreen implements Screen {
  scene: Scene

  constructor(public game: GameController) {
    this.scene = new Scene(game.engine)
    this.scene.clearColor = new Color4(.1, .03, .04, 1)
    new ArcRotateCamera('camera', 0, 0, 1, new Vector3(), this.scene)

    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI('UI')

    var image = new Image('bkg', '/assets/welcome.png')
    image.height = 1
    image.width = 1

    advancedTexture.onBeginLayoutObservable.add(() => {
      const aspect = ((image as any)._imageWidth / (image as any)._imageHeight) / (advancedTexture.getSize().width / advancedTexture.getSize().height)

      if (aspect > 1) {
        image.width = aspect
        image.height = 1
      } else {
        image.width = 1
        image.height = 1 / aspect
      }
    })
    
    advancedTexture.addControl(image)

    const textblock = new TextBlock()
    textblock.text = 'Welcome to Austin Social!'
    textblock.fontSize = 32
    textblock.top = '-100px'
    textblock.color = 'white'
    textblock.outlineWidth = 2
    textblock.outlineColor = '#222222'
    advancedTexture.addControl(textblock)

    const button1 = Button.CreateSimpleButton('button', 'Play Game')
    button1.width = '200px'
    button1.height = '40px'
    button1.color = 'rgba(0, 0, 0, .5)'
    button1.textBlock!.color = 'black'
    button1.textBlock!.fontWeight = 'bold'
    button1.cornerRadius = 20
    button1.background = 'white'
    button1.onPointerUpObservable.add(() => {
      this.game.screen.show(new GameScreen(this.game))
    })
    advancedTexture.addControl(button1)

    const button2 = Button.CreateSimpleButton('button', 'Customize Character')
    button2.width = '200px'
    button2.height = '40px'
    button2.color = 'rgba(0, 0, 0, .5)'
    button2.textBlock!.color = 'purple'
    button2.cornerRadius = 20
    button2.background = 'white'
    button2.top = '60px'
    button2.onPointerUpObservable.add(() => {
      this.game.screen.show(new CharacterCreatorScreen(this.game))
    })
    advancedTexture.addControl(button2)
  }

  start(): void {
  }

  update(): void {
  }

  render(): void {
    this.scene.render()
  }

  dispose(): void {
    this.scene.dispose()
  }
}