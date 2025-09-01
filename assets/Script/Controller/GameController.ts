
import { GameModel, GameModelObserver, GameState } from "../Model/GameModel";
import { Tile } from "../Model/Tile";
import { BoosterType } from "../Enums/BoosterType";

import GameBoardView from "../View/GameBoardView";
import UIView from "../View/UIView";

const {ccclass, property} = cc._decorator;

@ccclass
export default class GameController extends cc.Component implements GameModelObserver {
    @property(GameBoardView)
    boardView: GameBoardView = null;

    @property(UIView)
    uiView: UIView = null;

    @property(cc.Node)
    boosterBombButton: cc.Node = null;

    @property(cc.Node)
    boosterTeleportButton: cc.Node = null;

    private _gameModel: GameModel = null;

    onLoad() {
        this._gameModel = new GameModel();
        this._gameModel.setObserver(this);
        
        if (this.boardView) {
            this.boardView.init(this._gameModel.board);
            
            this.boardView.node.on('tile-clicked', this.onTileClicked, this);
        }

        if (this.uiView) {
            this.uiView.updateBombBoosters(this._gameModel.bombBoostersLeft);
            this.uiView.updateTeleportBoosters(this._gameModel.teleportBoostersLeft);
            
            this.updateBoosterButtonsState();
        }

        this.setupBoosterButtons();
        
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
    }
    
    private onKeyDown(event: cc.Event.EventKeyboard): void {
        if (event.keyCode === 49) {
            this.shuffleBoardWithAnimation();
        }
    }
    
    private shuffleBoardWithAnimation(): void {
        if (this.boardView && !this.boardView.isAnimating()) {
            this._gameModel.shuffleBoardWithAnimation();
        }
    }

    private setupBoosterButtons(): void {
        if (this.boosterBombButton) {
            this.boosterBombButton.on(cc.Node.EventType.TOUCH_END, this.onBoosterBombClicked, this);
        }

        if (this.boosterTeleportButton) {
            this.boosterTeleportButton.on(cc.Node.EventType.TOUCH_END, this.onBoosterTeleportClicked, this);
        }
    }

    private onTileClicked(event: any): void {
        const { row, col } = event;
        
        if (this.boardView && this.boardView.isAnimating()) {
            return;
        }
        
        if (this._gameModel.handleTileClick(row, col)) {
            if (this.boardView) {
                this.boardView.updateBoard();
            }
        }
    }

    private onBoosterBombClicked(): void {
        if ((this.boardView && this.boardView.isAnimating()) || 
            this._gameModel.gameState === GameState.GAME_OVER ||
            this._gameModel.gameState === GameState.ANIMATION_RUNNING) {
            return;
        }

        if (!this.boosterBombButton.getComponent(cc.Button).interactable)
            return;

        if (this._gameModel.activateBoosterMode(BoosterType.BOMB)) {
            this.updateBoosterButtonsState();
        }
    }

    private onBoosterTeleportClicked(): void {
        if ((this.boardView && this.boardView.isAnimating()) || 
            this._gameModel.gameState === GameState.GAME_OVER ||
            this._gameModel.gameState === GameState.ANIMATION_RUNNING) {
            return;
        }

        if (!this.boosterTeleportButton.getComponent(cc.Button).interactable)
            return;

        if (this._gameModel.activateBoosterMode(BoosterType.TELEPORT)) {
            this.updateBoosterButtonsState();
        }
    }

    onScoreChanged(score: number): void {
        if (this.uiView) {
            this.uiView.updateScore(score);
        }
    }

    onMovesChanged(moves: number): void {
        if (this.uiView) {
            this.uiView.updateMoves(moves);
        }
    }
    
    onBombBoostersChanged(count: number): void {
        if (this.uiView) {
            this.uiView.updateBombBoosters(count);
            
            this.updateBoosterButtonsState();
        }
    }
    
    onTeleportBoostersChanged(count: number): void {
        if (this.uiView) {
            this.uiView.updateTeleportBoosters(count);
            
            this.updateBoosterButtonsState();
        }
    }
    
    onBoosterHintCleared(): void {
        if (this.uiView) {
            this.uiView.clearBoosterHint();
            
            this.updateBoosterButtonsState();
        }
    }
    
    private updateBoosterButtonsState(): void {
        const gameState = this._gameModel.gameState;
        const bombBoostersLeft = this._gameModel.bombBoostersLeft;
        const teleportBoostersLeft = this._gameModel.teleportBoostersLeft;
        
        if (this.boosterBombButton) {
            const button = this.boosterBombButton.getComponent(cc.Button);
            if (button) {
                const isActive = bombBoostersLeft > 0 && gameState !== GameState.SELECTING_TELEPORT;
                button.interactable = isActive;
                this.boosterBombButton.opacity = isActive ? 255 : 128;
            }
        }
        
        if (this.boosterTeleportButton) {
            const button = this.boosterTeleportButton.getComponent(cc.Button);
            if (button) {
                const isActive = teleportBoostersLeft > 0 && gameState !== GameState.USING_BOMB;
                button.interactable = isActive;
                this.boosterTeleportButton.opacity = isActive ? 255 : 128;
            }
        }
    }

    onGameWon(): void {
        if (this.uiView) {
            this.uiView.showGameOver(true);
        }
    }

    onGameLost(): void {
        if (this.uiView) {
            this.uiView.showGameOver(false);
        }
    }

    onTilesRemoved(tiles: Tile[]): void {
        if (this.boardView) {
            const targetPosition = this._gameModel.pendingSuperTilePosition;
            
            this.boardView.animateRemoveTiles(tiles, targetPosition, () => {
                if (this._gameModel) {
                    this._gameModel.completeRemoveTiles();
                }
            });
        }
    }
    
    onChainExplosion(waves: Tile[][]): void {
        if (this.boardView) {
            this.boardView.animateChainExplosion(waves, () => {
                if (this._gameModel) {
                    this._gameModel.completeRemoveTiles();
                }
            });
        }
    }
    
    onTilesFell(): void {
        if (this.boardView) {
            this.boardView.updateBoard();
            this.boardView.animateFallingTiles(() => {
                if (this._gameModel) {
                    this._gameModel.completeTilesFall();
                }
            });
        }
    }
    
    onNewTilesAdded(): void {
        if (this.boardView) {
            this.boardView.updateBoard();
            this.boardView.animateNewTiles(() => {
                if (this._gameModel) {
                    this._gameModel.completeNewTilesAdded();
                    
                    this.boardView.updateBoard();
                }
            });
        }
    }
    
    onShuffled(): void {
        if (this.boardView) {
            this.boardView.updateBoard();
            
            this.boardView.animateShuffle(() => {
                if (this._gameModel.gameState === GameState.GAME_OVER || 
                    this._gameModel.gameState === GameState.ANIMATION_RUNNING) {
                    this._gameModel.restoreGameState();
                }
                
                this.boardView.updateBoard();
            });
        }
    }
    
    onTileSelected(tile: Tile): void {
        if (this.boardView) {
            this.boardView.highlightTile(tile.row, tile.col, true);
        }
    }
    
    onTileDeselected(): void {
        if (this.boardView) {
            this.boardView.clearHighlights();
        }
    }
    
    onBoosterActivated(boosterType: BoosterType): void {
        if (this.uiView) {
            this.uiView.showBoosterHint(boosterType);
        }
    }
    
    onTeleportSecondSelection(): void {
        if (this.uiView) {
            this.uiView.updateTeleportSecondHint();
        }
    }
    
    onTeleportAnimation(row1: number, col1: number, row2: number, col2: number): void {
        if (this.boardView) {
            this.boardView.animateTeleport(row1, col1, row2, col2, () => {
                this.boardView.updateBoard();
            });
        }
    }
    
    onSuperTileCreated(tile: Tile): void {
        if (this.boardView) {
            this.boardView.updateBoard();
            
            this.boardView.animateSuperTileCreation(tile.row, tile.col);
        }
    }
    
    onBombPlaced(row: number, col: number): void {
        if (this.boardView) {
            const boosterButtonWorldPos = this.boosterBombButton.parent.convertToWorldSpaceAR(
                this.boosterBombButton.position
            );
            
            const targetTileWorldPos = this.boardView.getTileWorldPosition(row, col);
            
            this.boardView.animateBombFlight(
                boosterButtonWorldPos,
                targetTileWorldPos,
                () => {
                    this.scheduleOnce(() => {
                        this._gameModel.explodeBomb(row, col);
                    }, 1.0);
                }
            );
        }
    }
}
