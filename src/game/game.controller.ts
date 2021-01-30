import { Engine } from '@babylonjs/core'
import { Observable } from 'rxjs'
import { MusicController } from './music.controller'
import { ScreenController } from './screen.controller'
import { MainScreen } from './screens/main.screen'

export class GameController {
    
  engine: Engine

  screen = new ScreenController(this)
  music = new MusicController(this)

  constructor(public say: Observable<string>, canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, false)

    this.screen.show(new MainScreen(this))

    this.engine.runRenderLoop(() => {
      this.screen.render()
    })
  }

  start() {

  }

  resize() {
    this.engine.resize()
  }
}
