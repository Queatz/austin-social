import { Scene } from '@babylonjs/core'

export interface Screen {
    start(): void
    dispose(): void
    update(): void
    render(): void
}