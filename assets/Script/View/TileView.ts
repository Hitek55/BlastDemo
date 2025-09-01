import { TileType } from "../Enums/TileType";

const {ccclass, property} = cc._decorator;

@ccclass
export default class TileView extends cc.Component {

    @property([cc.SpriteFrame])
    tileSprites: cc.SpriteFrame[] = [];

    private _tileType: TileType;
    private _row: number = 0;
    private _col: number = 0;

    sprite: cc.Sprite = null;
    
    onLoad() {
        this.sprite = this.getComponent(cc.Sprite);
        if (!this.sprite) {
            this.sprite = this.addComponent(cc.Sprite);
        }
    }

    init(type: TileType, row: number, col: number): void {
        this._tileType = type;
        this._row = row;
        this._col = col;
        this.updateSprite();
    }

    get tileType(): TileType {
        return this._tileType;
    }

    get row(): number {
        return this._row;
    }

    get col(): number {
        return this._col;
    }

    set row(value: number) {
        this._row = value;
    }

    set col(value: number) {
        this._col = value;
    }

    updateSprite(): void {
        if (!this.sprite || !this.tileSprites || this.tileSprites.length === 0) {
            return;
        }

        let spriteIndex = 0;
        
        switch (this._tileType) {
            case TileType.BLUE:
                spriteIndex = 0;
                break;
            case TileType.GREEN:
                spriteIndex = 1;
                break;
            case TileType.PURPLE:
                spriteIndex = 2;
                break;
            case TileType.RED:
                spriteIndex = 3;
                break;
            case TileType.YELLOW:
                spriteIndex = 4;
                break;
                
            case TileType.SUPER_ROW:
                spriteIndex = 5;
                break;
            case TileType.SUPER_COLUMN:
                spriteIndex = 6;
                break;
            case TileType.SUPER_BOMB:
                spriteIndex = 7;
                break;
            case TileType.SUPER_TNT:
                spriteIndex = 8;
                break;

            default:
                spriteIndex = 0;
                break;
        }
        
        if (spriteIndex >= 0 && spriteIndex < this.tileSprites.length) {
            this.sprite.spriteFrame = this.tileSprites[spriteIndex];
        }
    }
    
    playFlyToAnimation(targetX: number, targetY: number, callback?: Function): void {

        const originalOpacity = this.node.opacity;
        
        const dx = targetX - this.node.x;
        const dy = targetY - this.node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const duration = Math.min(0.5, 0.2 + distance / 1000);
        
        const moveTo = cc.moveTo(duration, targetX, targetY);
        const fadeOut = cc.fadeOut(duration);
        
        const spawn = cc.spawn(moveTo, fadeOut);
        
        const sequence = cc.sequence(
            spawn,
            cc.callFunc(() => {
                this.node.opacity = originalOpacity;
                
                if (callback) {
                    callback();
                }
            })
        );
        
        this.node.runAction(sequence);
    }

    playFallAnimation(targetY: number, callback?: Function): void {
        const duration = Math.abs(this.node.y - targetY) / 800;
        
        const fallAction = cc.sequence(
            cc.moveTo(duration, this.node.x, targetY).easing(cc.easeBackIn()),
            cc.callFunc(() => {
                if (callback) {
                    callback();
                }
            })
        );
        
        this.node.runAction(fallAction);
    }

    playNewTileAnimation(callback?: Function): void {
        this.node.scale = 0;
        this.node.opacity = 255;
        
        const sequence = cc.sequence(
            cc.scaleTo(0.2, 1.1).easing(cc.easeBackOut()),
            cc.scaleTo(0.1, 1),
            cc.callFunc(() => {
                if (callback) {
                    callback();
                }
            })
        );
        
        this.node.runAction(sequence);
    }
}
