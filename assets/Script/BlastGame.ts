import GameController from "./Controller/GameController";
import GameLayoutManager from "./View/GameLayoutManager";

const {ccclass, property} = cc._decorator;

@ccclass
export default class BlastGame extends cc.Component {

    @property(GameController)
    gameController: GameController = null;

    @property(GameLayoutManager)
    layoutManager: GameLayoutManager = null;

    start() {
        this.setupCanvas();
    }

    private setupCanvas() {
        const canvas = this.node.getComponent(cc.Canvas);
        if (canvas) {
            canvas.fitHeight = true;
            canvas.fitWidth = true;
            
            cc.view.setDesignResolutionSize(
                canvas.designResolution.width,
                canvas.designResolution.height,
                cc.ResolutionPolicy.SHOW_ALL
            );
        }
    }
}
