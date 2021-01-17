import { ArcRotateCamera, Color4, Scene, Vector3 } from '@babylonjs/core'
import { AdvancedDynamicTexture, Button, TextBlock } from '@babylonjs/gui'
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

    const textblock = new TextBlock()
    textblock.text = 'Welcome to Austin Social!'
    textblock.fontSize = 24
    textblock.top = '-100px'
    textblock.color = 'white'
    advancedTexture.addControl(textblock)

    const button1 = Button.CreateSimpleButton('button', 'Enter Game')
    button1.width = '200px'
    button1.height = '40px'
    button1.color = 'black'
    button1.cornerRadius = 20
    button1.background = 'white'
    button1.onPointerUpObservable.add(() => {
      this.game.screen.show(new GameScreen(this.game))
    })
    advancedTexture.addControl(button1)

    const button2 = Button.CreateSimpleButton('button', 'Customize Character')
    button2.width = '200px'
    button2.height = '40px'
    button2.color = 'black'
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