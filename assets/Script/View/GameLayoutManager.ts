const {ccclass, property} = cc._decorator;

@ccclass
export default class GameLayoutManager extends cc.Component {

    @property(cc.Node)
    background: cc.Node = null;

    @property(cc.Node)
    gameBoard: cc.Node = null;

    @property(cc.Node)
    uiContainer: cc.Node = null;

    onLoad() {
        this.adaptLayout();

        cc.view.on('canvas-resize', this.adaptLayout, this);
    }

    adaptLayout() {
        const visibleSize = cc.view.getVisibleSize();
        
        const bgSprite = this.background.getComponent(cc.Sprite);
        
        const bgSize = bgSprite.spriteFrame.getOriginalSize();
        const bgRatio = bgSize.width / bgSize.height;
        const screenRatio = visibleSize.width / visibleSize.height;
        
        if (screenRatio > bgRatio) {
            this.background.width = visibleSize.width;
            this.background.height = visibleSize.width / bgRatio;
        } else {
            this.background.height = visibleSize.height;
            this.background.width = visibleSize.height * bgRatio;
        }
        
        this.uiContainer.y = -visibleSize.height / 2 + this.uiContainer.height / 2;
    }
}
