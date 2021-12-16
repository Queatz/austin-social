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

  @ViewChild('sayInput', { static: true, read: ElementRef })
  sayInput!: ElementRef

  showSay = false

  say = new Subject<string>()
  game!: GameController

  @HostListener('window:keydown.esc')
  talkEsc() {
    if (this.showSay) {
      this.showSay = false
      this.renderCanvas.nativeElement.focus()
    }
  }

  @HostListener('window:keydown.enter')
  talk(): void {
    this.showSay = !this.showSay
    
    if (this.showSay) {
      setTimeout(() => {
        this.sayInput.nativeElement.focus()
      })
    } else {
      if (this.sayInput.nativeElement.value) {
        this.say.next(this.sayInput.nativeElement.value)
        this.sayInput.nativeElement.value = ''
      }
      
      this.renderCanvas.nativeElement.focus()
    }
  }

  ngOnInit(): void {
    this.renderCanvas.nativeElement.focus()
    
    this.game = new GameController(this.say, this.renderCanvas.nativeElement)
    this.game.start()

    window.addEventListener('resize', () => {
      this.game.resize()
    })
  }
}
