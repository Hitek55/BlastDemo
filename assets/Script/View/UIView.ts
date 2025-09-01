import { GameConfig } from "../Model/GameConfig";
import { BoosterType } from "../Enums/BoosterType";

const {ccclass, property} = cc._decorator;

@ccclass
export default class UIView extends cc.Component {
    @property(cc.Label)
    scoreLabel: cc.Label = null;

    @property(cc.Label)
    movesLabel: cc.Label = null;

    @property(cc.Label)
    bombBoostersLabel: cc.Label = null;

    @property(cc.Label)
    teleportBoostersLabel: cc.Label = null;

    @property(cc.Label)
    boosterHintLabel: cc.Label = null;

    @property(cc.Node)
    gameOverPanel: cc.Node = null;

    @property(cc.Label)
    gameOverLabel: cc.Label = null;

    onLoad() {
        this.updateScore(0);
        this.updateMoves(GameConfig.MAX_MOVES);
        this.updateBombBoosters(GameConfig.BOMB_BOOSTERS_COUNT);
        this.updateTeleportBoosters(GameConfig.TELEPORT_BOOSTERS_COUNT);
        
        this.clearBoosterHint();
        this.gameOverPanel.active = false;
        
        cc.view.on('canvas-resize', this.adaptToScreenSize, this);
        
        this.adaptToScreenSize();
    }
    
    adaptToScreenSize() {
        const visibleSize = cc.view.getVisibleSize();
        
        this.gameOverPanel.width = visibleSize.width * 0.8;
        this.gameOverPanel.height = visibleSize.height * 0.5;
    }

    updateScore(score: number): void {
        this.scoreLabel.string = `${score} / ${GameConfig.TARGET_SCORE}`;
    }

    updateMoves(moves: number): void {
        this.movesLabel.string = `${moves}`;
    }

    updateBombBoosters(count: number): void {
        this.bombBoostersLabel.string = `${count}`;
    }

    updateTeleportBoosters(count: number): void {
        this.teleportBoostersLabel.string = `${count}`;
    }

    showGameOver(isWin: boolean): void {
        this.gameOverPanel.active = true;
        
        this.gameOverLabel.string = isWin ? "Вы выиграли!" : "Вы проиграли!";
        
        this.gameOverPanel.scale = 0;
        this.gameOverPanel.opacity = 255;
        
        const sequence = cc.sequence(
            cc.scaleTo(0.3, 1.1).easing(cc.easeBackOut()),
            cc.scaleTo(0.1, 1)
        );
        
        this.gameOverPanel.runAction(sequence);
    }
    
    showBoosterHint(boosterType: BoosterType): void {
        switch (boosterType) {
            case BoosterType.BOMB:
                this.boosterHintLabel.string = "Выберите тайл\nдля взрыва";
                break;
                
            case BoosterType.TELEPORT:
                this.boosterHintLabel.string = "Выберите первый\nтайл для обмена";
                break;
                
            default:
                this.clearBoosterHint();
                break;
        }

    }
    
    updateTeleportSecondHint(): void {
        this.boosterHintLabel.string = "Выберите второй\nтайл для обмена";
    }
    
    clearBoosterHint(): void {
        this.boosterHintLabel.string = "БУСТЕРЫ";
    }
}
