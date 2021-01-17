import { ArcRotateCamera, Color4, Scene, Vector3 } from '@babylonjs/core'
import { AdvancedDynamicTexture, Button, TextBlock } from '@babylonjs/gui'
import { GameController } from '../game.controller'
import { Screen } from '../models'
import { MainScreen } from './main.screen'

export class CharacterCreatorScreen implements Screen {
  scene: Scene

  constructor(public game: GameController) {
    this.scene = new Scene(game.engine)
    this.scene.clearColor = new Color4(.1, .03, .04, 1)
    new ArcRotateCamera('camera', 0, 0, 1, new Vector3(), this.scene)

    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI('UI')

    const button1 = Button.CreateSimpleButton('button', 'Start the Game')
    button1.width = '200px'
    button1.height = '40px'
    button1.color = 'black'
    button1.top = advancedTexture.getSize().height / 2 - 40
    button1.cornerRadius = 20
    button1.background = 'white'
    button1.onPointerUpObservable.add(() => {
      this.game.screen.show(new MainScreen(this.game))
    })
    advancedTexture.addControl(button1)
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