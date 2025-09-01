
import { GameBoard } from "./GameBoard";
import { GameConfig } from "./GameConfig";
import { Tile } from "./Tile";
import { TileType } from "../Enums/TileType";
import { BoosterType } from "../Enums/BoosterType";
import { ExplosionType } from "../Enums/ExplosionType";


export enum GameState {
    PLAYING,
    SELECTING_TELEPORT,
    USING_BOMB,
    GAME_OVER,
    ANIMATION_RUNNING,
}

export interface GameModelObserver {
    onScoreChanged(score: number): void;
    onMovesChanged(moves: number): void;
    onGameWon(): void;
    onGameLost(): void;
    onTilesRemoved(tiles: Tile[]): void;
    onTilesFell?(): void;
    onNewTilesAdded?(): void;
    onShuffled?(): void;
    onTileSelected?(tile: Tile): void;
    onTileDeselected?(): void;
    onBoosterActivated?(boosterType: BoosterType): void;
    onSuperTileCreated?(tile: Tile): void;
    onChainExplosion?(waves: Tile[][]): void;
    onTeleportSecondSelection?(): void;
    onTeleportAnimation?(row1: number, col1: number, row2: number, col2: number): void;
    onBombPlaced?(row: number, col: number): void;
    onBombBoostersChanged?(count: number): void;
    onTeleportBoostersChanged?(count: number): void;
    onBoosterHintCleared?(): void;
}

export class GameModel {

    private _board: GameBoard;
    private _score: number = 0;
    private _movesLeft: number;
    private _bombBoostersLeft: number;
    private _teleportBoostersLeft: number;
    private _observer: GameModelObserver = null;
    private _gameState: GameState = GameState.PLAYING;
    private _activeBoosterType: BoosterType = null;
    private _shufflesUsed: number = 0;
    private _pendingSuperTilePosition: any = null;
    
    get pendingSuperTilePosition(): any {
        return this._pendingSuperTilePosition;
    }

    constructor() {
        this._board = new GameBoard();
        this._movesLeft = GameConfig.MAX_MOVES;
        this._bombBoostersLeft = GameConfig.BOMB_BOOSTERS_COUNT;
        this._teleportBoostersLeft = GameConfig.TELEPORT_BOOSTERS_COUNT;
    }

    get board(): GameBoard {
        return this._board;
    }

    get score(): number {
        return this._score;
    }

    get movesLeft(): number {
        return this._movesLeft;
    }

    get bombBoostersLeft(): number {
        return this._bombBoostersLeft;
    }

    get teleportBoostersLeft(): number {
        return this._teleportBoostersLeft;
    }

    get gameState(): GameState {
        return this._gameState;
    }

    get activeBoosterType(): BoosterType {
        return this._activeBoosterType;
    }

    get shufflesUsed(): number {
        return this._shufflesUsed;
    }

    setObserver(observer: GameModelObserver): void {
        this._observer = observer;
    }

    handleTileClick(row: number, col: number): boolean {
        if (this._movesLeft <= 0 || this._gameState === GameState.GAME_OVER || this._gameState === GameState.ANIMATION_RUNNING) {
            return false;
        }

        const clickedTile = this._board.getTile(row, col);
        if (!clickedTile) {
            return false;
        }

        switch (this._gameState) {
            case GameState.PLAYING:
                return this.handleNormalClick(clickedTile);
                
            case GameState.SELECTING_TELEPORT:
                return this.handleTeleportSelection(clickedTile);
                
            case GameState.USING_BOMB:
                return this.handleBombActivation(clickedTile);
        }

        return false;
    }

    private handleNormalClick(tile: Tile): boolean {
        if (tile.isSuperTile()) {
            return this.activateSuperTile(tile);
        }
        
        const connectedTiles = this._board.findConnectedTiles(tile.row, tile.col);
        
        if (connectedTiles.length < GameConfig.MIN_TILES_TO_BLAST) {
            return false;
        }

        this._movesLeft--;
        this.notifyMovesChanged();

        const earnedScore = GameConfig.getScoreForTiles(connectedTiles.length);
        this._score += earnedScore;
        this.notifyScoreChanged();

        const tilesToRemove = [...connectedTiles];

        let superTileCreated = false;

        if (connectedTiles.length >= GameConfig.TILE_COUNT_FOR_SUPER_TILE) {
            this._pendingSuperTilePosition = { row: tile.row, col: tile.col };
            
            const filteredTilesToRemove = tilesToRemove.filter(t => 
                t.row !== tile.row || t.col !== tile.col);
            
            this.notifyTilesRemoved(filteredTilesToRemove);
            this._board.removeTiles(filteredTilesToRemove);
            
            superTileCreated = true;
        } else {
            this.notifyTilesRemoved(tilesToRemove);
            this._board.removeTiles(tilesToRemove);
        }
        
        return true;
    }
    
    completeRemoveTiles(): void {
        if (this._pendingSuperTilePosition) {
            const { row, col } = this._pendingSuperTilePosition;
            const superTile = this._board.createSuperTile(row, col);

            if (superTile) {
                this.notifySuperTileCreated(superTile);
            }
            
            this._pendingSuperTilePosition = null;
        }
        
        this._board.applyGravity();
        this.notifyTilesFell();
    }
    
    completeTilesFall(): void {
        this._board.fillEmptyCells();
        this.notifyNewTilesAdded();
    }
    
    completeNewTilesAdded(): void {
        this.checkGameState();
    }

    private activateSuperTile(tile: Tile): boolean {
        this._movesLeft--;
        this.notifyMovesChanged();
        
        if (tile.type === TileType.SUPER_TNT || tile.type === TileType.SUPER_ROW || tile.type === TileType.SUPER_COLUMN) {
            return this.activateSpecialSuperTile(tile);
        }
        
        const tilesToRemove = this._board.activateSuperTile(tile.row, tile.col);
        
        const earnedScore = GameConfig.getScoreForTiles(tilesToRemove.length);
        this._score += earnedScore;
        this.notifyScoreChanged();
        
        this._board.removeTiles(tilesToRemove);
        
        this.notifyTilesRemoved(tilesToRemove);
        
        return true;
    }
    
    private activateSpecialSuperTile(tile: Tile): boolean {
        let explosionWaves: Tile[][];
        
        switch (tile.type) {
            case TileType.SUPER_TNT:
                explosionWaves = this._board.calculateExplosionWaves(tile.row, tile.col, ExplosionType.BOMB);
                break;
                
            case TileType.SUPER_ROW:
                explosionWaves = this._board.calculateExplosionWaves(tile.row, tile.col, ExplosionType.ROW);
                break;
                
            case TileType.SUPER_COLUMN:
                explosionWaves = this._board.calculateExplosionWaves(tile.row, tile.col, ExplosionType.COLUMN);
                break;
                
            default:
                return false;
        }
        
        const allTilesToRemove: Tile[] = [];
        explosionWaves.forEach(wave => {
            allTilesToRemove.push(...wave);
        });
        
        const earnedScore = GameConfig.getScoreForTiles(allTilesToRemove.length);
        this._score += earnedScore;
        this.notifyScoreChanged();
        
        this._board.removeTiles(allTilesToRemove);
        
        this.notifyChainExplosion(explosionWaves);
        
        return true;
    }
    
    activateBoosterMode(boosterType: BoosterType): boolean {
        if (this._gameState === GameState.GAME_OVER || this._gameState === GameState.ANIMATION_RUNNING) {
            return false;
        }
        
        if (boosterType === BoosterType.BOMB && this._bombBoostersLeft <= 0) {
            return false;
        }
        
        if (boosterType === BoosterType.TELEPORT && this._teleportBoostersLeft <= 0) {
            return false;
        }
        
        this._activeBoosterType = boosterType;
        
        switch (boosterType) {
            case BoosterType.BOMB:
                this._gameState = GameState.USING_BOMB;
                break;
                
            case BoosterType.TELEPORT:
                this._gameState = GameState.SELECTING_TELEPORT;
                break;
        }
        
        this.notifyBoosterActivated(boosterType);
        
        return true;
    }

    private handleTeleportSelection(tile: Tile): boolean {
        if (!this._board.selectedTile && this._teleportBoostersLeft <= 0) {
            return false;
        }

        if (!this._board.selectedTile) {
            if (this._board.selectTileForTeleport(tile.row, tile.col)) {
                this.notifyTileSelected(tile);
                this.notifyTeleportSecondSelection();
                return true;
            }
            return false;
        }
        
        const selectedTile = this._board.selectedTile;
        const row1 = selectedTile.row;
        const col1 = selectedTile.col;
        const row2 = tile.row;
        const col2 = tile.col;
        
        if (row1 === row2 && col1 === col2) {
            return false;
        }
        
        if (this._board.teleportTiles(tile.row, tile.col)) {
            this._teleportBoostersLeft--;
            this.notifyTeleportBoostersChanged();
            
            this._gameState = GameState.PLAYING;
            this._activeBoosterType = null;
            this.notifyTileDeselected();
            this.notifyBoosterHintCleared();
            
            this.notifyTeleportAnimation(row1, col1, row2, col2);
            
            this.checkGameState();
            
            return true;
        }
        
        return false;
    }
    
    private notifyTeleportSecondSelection(): void {
        if (this._observer && this._observer.onTeleportSecondSelection) {
            this._observer.onTeleportSecondSelection();
        }
    }
    
    private notifyTeleportAnimation(row1: number, col1: number, row2: number, col2: number): void {
        if (this._observer && this._observer.onTeleportAnimation) {
            this._observer.onTeleportAnimation(row1, col1, row2, col2);
        }
    }

    private handleBombActivation(tile: Tile): boolean {
        if (tile.isSuperTile()) {
            return false;
        }
        
        if (this._bombBoostersLeft <= 0) {
            return false;
        }
        
        this._bombBoostersLeft--;
        this.notifyBombBoostersChanged();
        
        this.notifyBombPlaced(tile.row, tile.col);
        
        this._gameState = GameState.PLAYING;
        this._activeBoosterType = null;
        this.notifyBoosterHintCleared();
        
        return true;
    }
    
    explodeBomb(row: number, col: number): void {
        const tilesToRemove = this._board.activateBombBooster(row, col);
        
        const earnedScore = GameConfig.getScoreForTiles(tilesToRemove.length);
        this._score += earnedScore;
        this.notifyScoreChanged();
        
        this._board.removeTiles(tilesToRemove);
        
        this.notifyTilesRemoved(tilesToRemove);
    }

    private checkGameState(): void {
        if (this._score >= GameConfig.TARGET_SCORE) {
            this._gameState = GameState.GAME_OVER;
            this.notifyGameWon();
            return;
        }

        if (!this._board.hasValidMoves()) {
            if (this._shufflesUsed < GameConfig.MAX_SHUFFLES) {
                this._board.shuffleGrid();
                this._shufflesUsed++;
                this.notifyShuffled();

                console.log("Поле перемешано", this._shufflesUsed);
            } else {
                this._gameState = GameState.GAME_OVER;
                this.notifyGameLost();

                console.log("Игра закончена, поле перемешано 3 раза");
            }
            return;
        }

        if (this._movesLeft <= 0) {
            this._gameState = GameState.GAME_OVER;
            this.notifyGameLost();

            console.log("Игра закончена, кончились ходы");
            return;
        }
    }

    shuffleBoardWithAnimation(): void {
        if (this._gameState !== GameState.PLAYING) {
            return;
        }
        
        this._gameState = GameState.ANIMATION_RUNNING;
        
        this._board.shuffleGrid();
        
        this.notifyShuffled();
    }
    
    restoreGameState(): void {
        this._gameState = GameState.PLAYING;
    }

    private notifyScoreChanged(): void {
        if (this._observer) {
            this._observer.onScoreChanged(this._score);
        }
    }

    private notifyMovesChanged(): void {
        if (this._observer) {
            this._observer.onMovesChanged(this._movesLeft);
        }
    }

    private notifyGameWon(): void {
        if (this._observer) {
            this._observer.onGameWon();
        }
    }

    private notifyGameLost(): void {
        if (this._observer) {
            this._observer.onGameLost();
        }
    }

    private notifyTilesRemoved(tiles: Tile[]): void {
        if (this._observer) {
            this._observer.onTilesRemoved(tiles);
        }
    }
    
    private notifyChainExplosion(waves: Tile[][]): void {
        if (this._observer && this._observer.onChainExplosion) {
            this._observer.onChainExplosion(waves);
        }
    }

    private notifyTilesFell(): void {
        if (this._observer && this._observer.onTilesFell) {
            this._observer.onTilesFell();
        }
    }

    private notifyNewTilesAdded(): void {
        if (this._observer && this._observer.onNewTilesAdded) {
            this._observer.onNewTilesAdded();
        }
    }

    private notifyShuffled(): void {
        if (this._observer && this._observer.onShuffled) {
            this._observer.onShuffled();
        }
    }

    private notifyTileSelected(tile: Tile): void {
        if (this._observer && this._observer.onTileSelected) {
            this._observer.onTileSelected(tile);
        }
    }

    private notifyTileDeselected(): void {
        if (this._observer && this._observer.onTileDeselected) {
            this._observer.onTileDeselected();
        }
    }

    private notifyBoosterActivated(boosterType: BoosterType): void {
        if (this._observer && this._observer.onBoosterActivated) {
            this._observer.onBoosterActivated(boosterType);
        }
    }

    private notifySuperTileCreated(tile: Tile): void {
        if (this._observer && this._observer.onSuperTileCreated) {
            this._observer.onSuperTileCreated(tile);
        }
    }
    
    private notifyBombPlaced(row: number, col: number): void {
        if (this._observer && this._observer.onBombPlaced) {
            this._observer.onBombPlaced(row, col);
        }
    }
    
    private notifyBombBoostersChanged(): void {
        if (this._observer && this._observer.onBombBoostersChanged) {
            this._observer.onBombBoostersChanged(this._bombBoostersLeft);
        }
    }
    
    private notifyTeleportBoostersChanged(): void {
        if (this._observer && this._observer.onTeleportBoostersChanged) {
            this._observer.onTeleportBoostersChanged(this._teleportBoostersLeft);
        }
    }
    
    private notifyBoosterHintCleared(): void {
        if (this._observer && this._observer.onBoosterHintCleared) {
            this._observer.onBoosterHintCleared();
        }
    }
}
