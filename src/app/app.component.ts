import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core'

import '@babylonjs/loaders/glTF'
import '@babylonjs/core/Physics/Plugins/cannonJSPlugin'
import { Subject } from 'rxjs'
import { GameController } from 'src/game/game.controller'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  @ViewChild('renderCanvas', { static: true, read: ElementRef })
  renderCanvas!: ElementRef

  say = new Subject<string>()
  game!: GameController

  @HostListener('window:keydown.enter')
  talk(): void {
    const result = prompt('hey')
    
    if (result) {
      this.say.next(result)
    }
  }

  ngOnInit(): void {
    this.game = new GameController(this.say, this.renderCanvas.nativeElement)
    this.game.start()

    window.addEventListener('resize', () => {
      this.game.resize()
    })
  }
}
