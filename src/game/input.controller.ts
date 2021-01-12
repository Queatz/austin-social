import { ActionManager, ExecuteCodeAction, Scene } from '@babylonjs/core'

export class InputController {
  
  private inputMap: any = {}

  constructor(scene: Scene) {
    scene.actionManager = new ActionManager(scene)
    scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, evt => {
        this.inputMap[evt.sourceEvent.key] = evt.sourceEvent.type == 'keydown'
    }))
    scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, evt => {
        this.inputMap[evt.sourceEvent.key] = evt.sourceEvent.type == 'keydown'
    }))
  }

  pressed(key: string): boolean {
    return this.inputMap[key]
  }
}
