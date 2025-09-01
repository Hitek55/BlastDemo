import TileFragment from "./TileFragment";

const {ccclass, property} = cc._decorator;

@ccclass
export default class ExplosionManager extends cc.Component {
    @property
    fragmentsCount: number = 9;
    
    @property
    explosionDuration: number = 0.3;
    
    @property
    explosionForce: number = 700;
    
    @property
    upwardForce: number = 400;
    
    @property
    rotationSpeed: number = 360;
    
    private _fragmentsPool: cc.Node[] = [];
    private _poolSize: number = 100;
    
    onLoad() {
        this.initFragmentsPool();
    }
    
    private initFragmentsPool(): void {
        for (let i = 0; i < this._poolSize; i++) {
            const fragmentNode = this.createFragmentNode();
            fragmentNode.active = false;
            this._fragmentsPool.push(fragmentNode);
        }
    }
    
    private createFragmentNode(): cc.Node {
        const fragmentNode = new cc.Node('TileFragment');
        fragmentNode.parent = this.node;
        fragmentNode.addComponent(TileFragment);
        
        return fragmentNode;
    }
    
    private getFragmentFromPool(): cc.Node {
        for (let i = 0; i < this._fragmentsPool.length; i++) {
            if (!this._fragmentsPool[i].active) {
                return this._fragmentsPool[i];
            }
        }
        
        const fragmentNode = this.createFragmentNode();
        this._fragmentsPool.push(fragmentNode);
        
        return fragmentNode;
    }
    
    createExplosion(tileNode: cc.Node, spriteFrame: cc.SpriteFrame, callback?: Function): void {
        if (!tileNode || !spriteFrame) {
            if (callback) callback();
            return;
        }
        
        const worldPos = tileNode.parent.convertToWorldSpaceAR(cc.v2(tileNode.x, tileNode.y));
        const localPos = this.node.convertToNodeSpaceAR(worldPos);
        
        const tileWidth = tileNode.width;
        const tileHeight = tileNode.height;
        
        const fragmentsX = Math.floor(Math.sqrt(this.fragmentsCount));
        const fragmentsY = Math.ceil(this.fragmentsCount / fragmentsX);
        
        const fragmentWidth = tileWidth / fragmentsX * 2;
        const fragmentHeight = tileHeight / fragmentsY * 2;
        
        let fragmentsCreated = 0;
        let animationsCompleted = 0;
        
        for (let y = 0; y < fragmentsY; y++) {
            for (let x = 0; x < fragmentsX; x++) {
                if (fragmentsCreated >= this.fragmentsCount) break;
                
                const offsetX = (x - (fragmentsX - 1) / 2) * fragmentWidth;
                const offsetY = (y - (fragmentsY - 1) / 2) * fragmentHeight;
                
                const fragmentNode = this.getFragmentFromPool();
                fragmentNode.active = true;
                
                const textureOffsetX = (x / fragmentsX) * tileWidth;
                const textureOffsetY = (y / fragmentsY) * tileHeight;
                
                const fragment = fragmentNode.getComponent(TileFragment);
                if (fragment) {
                    fragment.init(
                        spriteFrame,
                        localPos.x + offsetX,
                        localPos.y + offsetY,
                        fragmentWidth,
                        fragmentHeight,
                        textureOffsetX,
                        textureOffsetY
                    );
                    
                    const angle = Math.random() * Math.PI * 2;
                    const force = this.explosionForce * (0.5 + Math.random() * 0.5);
                    
                    const upwardForce = this.upwardForce * (0.7 + Math.random() * 0.6);
                    
                    const velocityX = Math.cos(angle) * force;
                    const velocityY = Math.sin(angle) * force + upwardForce;
                    
                    const rotation = (Math.random() > 0.5 ? 1 : -1) * this.rotationSpeed * (0.5 + Math.random() * 0.5);
                    
                    const onAnimationComplete = function() {
                        animationsCompleted++;
                        
                        if (animationsCompleted === fragmentsCreated && callback) {
                            callback();
                        }
                    };
                    
                    fragment.playExplosionAnimation(
                        velocityX,
                        velocityY,
                        rotation,
                        this.explosionDuration,
                        onAnimationComplete
                    );
                    
                    fragmentsCreated++;
                }
            }
        }
        
        if (fragmentsCreated === 0 && callback) {
            callback();
        }
    }

}
