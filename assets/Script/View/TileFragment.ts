
const {ccclass, property} = cc._decorator;

@ccclass
export default class TileFragment extends cc.Component {
    @property(cc.Sprite)
    sprite: cc.Sprite = null;
    
    init(spriteFrame: cc.SpriteFrame, x: number, y: number, width: number, height: number, offsetX: number, offsetY: number): void {
        if (!this.sprite) {
            this.sprite = this.getComponent(cc.Sprite);
            if (!this.sprite) {
                this.sprite = this.addComponent(cc.Sprite);
            }
        }
        
        this.sprite.spriteFrame = spriteFrame;
        
        this.node.width = width;
        this.node.height = height;
        this.node.x = x;
        this.node.y = y;
        
        this.sprite.type = cc.Sprite.Type.SLICED;
        
        const rect = this.sprite.spriteFrame.getRect();
        const texture = this.sprite.spriteFrame.getTexture();
        
        const newFrame = new cc.SpriteFrame(
            texture,
            cc.rect(rect.x + offsetX, rect.y + offsetY, width, height),
            false,
            cc.v2(0, 0),
            cc.size(width, height)
        );
        
        this.sprite.spriteFrame = newFrame;
    }
    
    playExplosionAnimation(velocityX: number, velocityY: number, rotationSpeed: number, duration: number, callback?: Function): void {
        const gravity = 980*2;
        
        cc.tween(this.node)
            .to(duration, {
                scale: 0.3,
                opacity: 0
            }, {
                easing: 'quadOut'
            })
            .start();
        
        let currentVelX = velocityX;
        let currentVelY = velocityY;
        let currentTime = 0;
        let callbackCalled = false;
        const dt = 1/60;
        
        const update = () => {
            currentTime += dt;
            
            if (!callbackCalled && currentTime >= duration * 0.2 && callback) {
                callbackCalled = true;
                callback();
            }
            
            if (currentTime >= duration) {
                this.unschedule(update);
                this.node.removeFromParent(true);
                return;
            }
            
            currentVelY -= gravity * dt;
            
            this.node.x += currentVelX * dt;
            this.node.y += currentVelY * dt;
            this.node.angle += rotationSpeed * dt;
        };
        
        this.schedule(update, dt);
        
        this.node.once('beforeremove', () => {
            this.unschedule(update);
        });
    }
}
