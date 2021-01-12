import { GameController } from './game.controller'
import { Screen } from './models'

export class ScreenController {
  private activeScreen?: Screen

  constructor(private game: GameController) {
  }

  show(screen: Screen) {
    this.activeScreen?.dispose()
    this.activeScreen = screen
    screen.start()
  }

  render() {
    this.activeScreen?.render()
  }
}