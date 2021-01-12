import { Scene, Sound } from "@babylonjs/core"
import { GameController } from './game.controller'

export class MusicController {

  constructor(private game: GameController) {
  }

  private activeMusic?: Sound

  play(music: string, scene: Scene) {
    this.activeMusic?.stop()

    this.activeMusic = new Sound('Music', `assets/${music}`, scene, null, {
      loop: true,
      autoplay: true,
      volume: .25
    })
  }
}
