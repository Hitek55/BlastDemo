import { GameBoard } from "../Model/GameBoard";
import { GameConfig } from "../Model/GameConfig";
import { Tile } from "../Model/Tile";
import TileView from "./TileView";
import ExplosionManager from "./ExplosionManager";

const {ccclass, property} = cc._decorator;

@ccclass
export default class GameBoardView extends cc.Component {
    @property(cc.Prefab)
    tilePrefab: cc.Prefab = null;

    @property([cc.SpriteFrame])
    tileSprites: cc.SpriteFrame[] = [];

    @property
    initialPoolSize: number = 100;
    
    @property(ExplosionManager)
    explosionManager: ExplosionManager = null;

    private _tileViews: TileView[][] = [];
    private _gameBoard: GameBoard = null;
    private _isAnimating: boolean = false;
    private _tilePool: cc.Node[] = [];
    
    private startAnimation(): void {
        this._isAnimating = true;
    }
    
    private endAnimation(callback?: Function): void {
        this._isAnimating = false;
        if (callback) {
            callback();
        }
    }
    
    private createAnimationCounter(totalCount: number, callback?: Function): { 
        decrease: () => void,
        complete: () => boolean 
    } {
        let count = totalCount;
        
        return {
            decrease: () => {
                count--;
                if (count <= 0) {
                    this.endAnimation(callback);
                }
            },
            complete: () => count <= 0
        };
    }
    
    private calculateBoardPositions(): { 
        startX: number, 
        startY: number, 
        boardWidth: number, 
        boardHeight: number 
    } {
        const rows = this._gameBoard.rows;
        const cols = this._gameBoard.cols;
        const tileSize = GameConfig.TILE_SIZE;
        
        const boardWidth = cols * tileSize;
        const boardHeight = rows * tileSize;
        
        const startX = -boardWidth / 2 + tileSize / 2;
        const startY = boardHeight / 2 - tileSize / 2;
        
        return { startX, startY, boardWidth, boardHeight };
    }
    
    private getTilePosition(row: number, col: number): { x: number, y: number } {
        const { startX, startY } = this.calculateBoardPositions();
        const tileSize = GameConfig.TILE_SIZE;
        
        return {
            x: startX + col * tileSize,
            y: startY - row * tileSize
        };
    }
    
    private createTileExplosion(tileView: TileView, onComplete?: Function): void {
        if (!tileView || !tileView.node || !tileView.sprite || !tileView.sprite.spriteFrame) {
            if (onComplete) onComplete();
            return;
        }
        
        const tileNodeCopy = cc.instantiate(tileView.node);
        tileNodeCopy.parent = this.node;
        tileNodeCopy.position = tileView.node.position;
        tileNodeCopy.scale = tileView.node.scale;
        tileNodeCopy.opacity = 0;
        
        tileView.node.scale = 0;
        tileView.node.opacity = 0;
        tileView.node.active = false;
        
        this.explosionManager.createExplosion(
            tileNodeCopy,
            tileView.sprite.spriteFrame,
            () => {
                if (tileNodeCopy && tileNodeCopy.isValid) {
                    tileNodeCopy.removeFromParent(true);
                }
                
                if (onComplete) onComplete();
            }
        );
    }
    
    private createFlyingTile(tileView: TileView, targetX: number, targetY: number, onComplete?: Function): void {
        if (!tileView || !tileView.node) {
            if (onComplete) onComplete();
            return;
        }
        
        const originalScale = tileView.node.scale;
        tileView.node.scale = 0;
        tileView.node.opacity = 0;
        
        const tileNodeCopy = cc.instantiate(tileView.node);
        tileNodeCopy.parent = this.node;
        tileNodeCopy.position = tileView.node.position;
        tileNodeCopy.scale = originalScale;
        tileNodeCopy.opacity = 255;
        
        const copyTileView = tileNodeCopy.getComponent(TileView);
        if (copyTileView) {
            copyTileView.playFlyToAnimation(targetX, targetY, () => {
                tileNodeCopy.removeFromParent(true);
                if (onComplete) onComplete();
            });
        } else {
            tileNodeCopy.removeFromParent(true);
            if (onComplete) onComplete();
        }
    }

    onLoad() {
        cc.view.on('canvas-resize', this.adaptToScreenSize, this);
        
        this.initTilePool();
    }
    
    private initTilePool(): void {
        if (!this.tilePrefab) {
            return;
        }
        
        for (let i = 0; i < this.initialPoolSize; i++) {
            const tileNode = cc.instantiate(this.tilePrefab);
            tileNode.parent = this.node;
            tileNode.active = false;
            
            const tileView = tileNode.getComponent(TileView);
            if (tileView) {
                tileView.tileSprites = this.tileSprites;
            }
            
            this._tilePool.push(tileNode);
        }
    }
    
    private getTileFromPool(): cc.Node {
        if (this._tilePool.length > 0) {
            const tileNode = this._tilePool.pop();
            tileNode.active = true;
            tileNode.scale = 1;

            return tileNode;
        }
        
        if (!this.tilePrefab) {
            return null;
        }
        
        const tileNode = cc.instantiate(this.tilePrefab);
        tileNode.parent = this.node;
        tileNode.scale = 1;
        
        const tileView = tileNode.getComponent(TileView);
        if (tileView) {
            tileView.tileSprites = this.tileSprites;
        }
        
        return tileNode;
    }
    
    private returnTileToPool(tileNode: cc.Node): void {
        tileNode.active = false;
        tileNode.scale = 0;

        this._tilePool.push(tileNode);
    }

    adaptToScreenSize() {
        if (!this._gameBoard) {
            return;
        }

        const rows = this._gameBoard.rows;
        const cols = this._gameBoard.cols;
        const tileSize = GameConfig.TILE_SIZE;

        const boardWidth = cols * tileSize;
        const boardHeight = rows * tileSize;

        const visibleSize = cc.view.getVisibleSize();
        
        const scaleX = (visibleSize.width * 0.9) / boardWidth;
        const scaleY = (visibleSize.height * 0.9) / boardHeight;
        
        const scale = Math.min(scaleX, scaleY);
        
        this.node.scale = scale;
    }

    init(gameBoard: GameBoard): void {
        this._gameBoard = gameBoard;
        
        this.createTileViews();
        
        this.adaptToScreenSize();
    }

    private createTileViews(): void {
        for (let row = 0; row < this._tileViews.length; row++) {
            for (let col = 0; col < this._tileViews[row]?.length || 0; col++) {
                const tileView = this._tileViews[row][col];
                if (tileView && tileView.node) {
                    this.returnTileToPool(tileView.node);
                }
            }
        }
        
        this._tileViews = [];

        if (!this._gameBoard) {
            return;
        }

        const rows = this._gameBoard.rows;
        const cols = this._gameBoard.cols;
        const tileSize = GameConfig.TILE_SIZE;

        const boardWidth = cols * tileSize;
        const boardHeight = rows * tileSize;

        const startX = -boardWidth / 2 + tileSize / 2;
        const startY = boardHeight / 2 - tileSize / 2;

        for (let row = 0; row < rows; row++) {
            this._tileViews[row] = [];

            for (let col = 0; col < cols; col++) {
                const tile = this._gameBoard.getTile(row, col);
                if (tile) {
                    const tileNode = this.getTileFromPool();
                    
                    tileNode.x = startX + col * tileSize;
                    tileNode.y = startY - row * tileSize;
                    
                    const tileView = tileNode.getComponent(TileView);
                    if (tileView) {
                        tileView.init(tile.type, row, col);
                        
                        tileNode.off(cc.Node.EventType.TOUCH_END);
                        
                        tileNode.on(cc.Node.EventType.TOUCH_END, () => {
                            if (tileView) {
                                this.onTileClicked(tileView.row, tileView.col);
                            }
                        });
                        
                        this._tileViews[row][col] = tileView;
                    } else {
                        this._tileViews[row][col] = null;
                    }
                } else {
                    this._tileViews[row][col] = null;
                }
            }
        }
    }

    private onTileClicked(row: number, col: number): void {
        if (this._isAnimating) {
            return;
        }
        
        this.node.emit('tile-clicked', { row, col });
    }

    updateBoard(): void {
        if (!this._gameBoard) {
            return;
        }

        const rows = this._gameBoard.rows;
        const cols = this._gameBoard.cols;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const tile = this._gameBoard.getTile(row, col);
                const tileView = this._tileViews[row][col];
                
                if (tile && tileView) {
                    tileView.init(tile.type, row, col);
                    
                    if (tile.isSuperTile()) {
                        tileView.node.zIndex = 10;
                    } else {
                        tileView.node.zIndex = 0;
                    }
                }
            }
        }
    }

    animateChainExplosion(waves: Tile[][], callback?: Function, delayMs?: number): void {
        this.startAnimation();
        let currentWaveIndex = 0;
        
        const waveDelay = delayMs !== undefined ? delayMs : this.determineWaveDelayFromTiles(waves);
        
        const animateNextWave = () => {
            if (currentWaveIndex >= waves.length) {
                this.endAnimation(callback);
                return;
            }
            
            const currentWave = waves[currentWaveIndex];

            this.animateWaveExplosion(currentWave, () => {
                currentWaveIndex++;
                this.scheduleOnce(() => {
                    animateNextWave();
                }, waveDelay / 1000);
            });
        };
        
        animateNextWave();
    }
    
    private determineWaveDelayFromTiles(waves: Tile[][]): number {
        if (waves.length === 0 || waves[0].length === 0) {
            return 0;
        }
        
        const firstWave = waves[0];
        const totalTiles = waves.reduce((sum, wave) => sum + wave.length, 0);
        const boardSize = this._gameBoard.rows * this._gameBoard.cols;
        
        if (totalTiles >= boardSize * 0.8) {
            return 0;
        }
        
        if (firstWave.length === 1) {
            return 0;
        }
        
        return 0;
    }
    
    private animateWaveExplosion(tiles: Tile[], callback?: Function): void {
        if (tiles.length === 0) {
            if (callback) callback();
            return;
        }
        
        const tilesByType = new Map<number, {tile: Tile, view: TileView}[]>();
        let validTilesCount = 0;
        
        for (const tile of tiles) {
            const tileView = this._tileViews[tile.row][tile.col];
            
            if (!tileView || !tileView.node || !tileView.node.isValid || 
                tileView.node.scale <= 0 || tileView.node.opacity <= 0 || 
                !tileView.sprite || !tileView.sprite.spriteFrame) {
                continue;
            }
            
            const typeKey = tile.type;
            if (!tilesByType.has(typeKey)) {
                tilesByType.set(typeKey, []);
            }
            
            tilesByType.get(typeKey).push({tile, view: tileView});
            validTilesCount++;
        }
        
        if (validTilesCount === 0) {
            if (callback) callback();
            return;
        }
        
        const counter = this.createAnimationCounter(validTilesCount, callback);
        
        tilesByType.forEach((tileGroup, typeKey) => {
            if (tileGroup.length > 0 && this.explosionManager) {
                const firstTileView = tileGroup[0].view;
                const spriteFrame = firstTileView.sprite.spriteFrame;
                
                tileGroup.forEach(({tile, view: tileView}) => {
                    const position = {
                        x: tileView.node.x,
                        y: tileView.node.y
                    };
                    
                    tileView.node.scale = 0;
                    tileView.node.opacity = 0;
                    tileView.node.active = false;
                    
                    this.explosionManager.createExplosion(
                        {
                            parent: this.node,
                            x: position.x,
                            y: position.y,
                            width: tileView.node.width,
                            height: tileView.node.height
                        } as cc.Node,
                        spriteFrame,
                        counter.decrease
                    );
                    
                    this.returnTileToPool(tileView.node);
                    this._tileViews[tile.row][tile.col] = null;
                });
            }
        });
    }

    animateRemoveTiles(tiles: Tile[], targetPosition?: any, callback?: Function): void {
        this.startAnimation();
        
        const tilesToAnimate = [...tiles];
        
        const tileStates = tilesToAnimate.map(tile => ({
            row: tile.row,
            col: tile.col,
            type: tile.type,
            tileView: this._tileViews[tile.row][tile.col]
        }));
        
        let targetX = null;
        let targetY = null;
        
        if (targetPosition) {
            if (this._tileViews[targetPosition.row] && this._tileViews[targetPosition.row][targetPosition.col]) {
                const targetTileView = this._tileViews[targetPosition.row][targetPosition.col];
                targetX = targetTileView.node.x;
                targetY = targetTileView.node.y;
            } else {
                const position = this.getTilePosition(targetPosition.row, targetPosition.col);
                targetX = position.x;
                targetY = position.y;
            }
        }
        
        const validTileStates = tileStates.filter(state => state.tileView != null);
        
        if (validTileStates.length === 0) {
            this.endAnimation(callback);
            return;
        }
        
        const counter = this.createAnimationCounter(validTileStates.length, callback);
        
        validTileStates.forEach(tileState => {
            const { row, col, tileView } = tileState;
            
            if (targetPosition && (row !== targetPosition.row || col !== targetPosition.col)) {
                this.createFlyingTile(tileView, targetX, targetY, () => {
                    this.returnTileToPool(tileView.node);
                    this._tileViews[row][col] = null;
                    counter.decrease();
                });
            } else {
                this.createTileExplosion(tileView, () => {
                    this.returnTileToPool(tileView.node);
                    this._tileViews[row][col] = null;
                    counter.decrease();
                });
            }
        });
    }

    animateFallingTiles(callback?: Function): void {
        this.startAnimation();
        
        const rows = this._gameBoard.rows;
        const cols = this._gameBoard.cols;
        const { startY } = this.calculateBoardPositions();
        
        const oldTileViews = Array(rows).fill(null).map((_, row) => 
            Array(cols).fill(null).map((_, col) => this._tileViews[row][col])
        );
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                this._tileViews[row][col] = null;
            }
        }
        
        let animationsToRun = 0;
        
        for (let col = 0; col < cols; col++) {
            const tilesInColumn = [];
            for (let row = 0; row < rows; row++) {
                const tileView = oldTileViews[row][col];
                if (tileView) {
                    tilesInColumn.push({
                        view: tileView,
                        oldRow: row
                    });
                }
            }
            
            let currentRow = rows - 1;
            for (let i = tilesInColumn.length - 1; i >= 0; i--) {
                const tileData = tilesInColumn[i];
                const tileView = tileData.view;
                const oldRow = tileData.oldRow;
                
                this._tileViews[currentRow][col] = tileView;
                
                const tile = this._gameBoard.getTile(currentRow, col);
                
                if (tile) {
                    tileView.init(tile.type, currentRow, col);
                } else {
                    tileView.row = currentRow;
                    tileView.col = col;
                }
                
                if (oldRow !== currentRow) {
                    const position = this.getTilePosition(currentRow, col);
                    animationsToRun++;
                    
                    tileView.playFallAnimation(position.y, () => {
                        animationsToRun--;
                        if (animationsToRun === 0) {
                            this.endAnimation(callback);
                        }
                    });
                }
                
                currentRow--;
            }
        }
        
        if (animationsToRun === 0) {
            this.endAnimation(callback);
        }
    }

    animateNewTiles(callback?: Function): void {
        this.startAnimation();
        
        const rows = this._gameBoard.rows;
        const cols = this._gameBoard.cols;
        
        let newTilesCount = 0;
        const tilesToCreate = [];
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const tile = this._gameBoard.getTile(row, col);
                if (tile && !this._tileViews[row][col]) {
                    tilesToCreate.push({ row, col, tile });
                    newTilesCount++;
                }
            }
        }
        
        if (newTilesCount === 0) {
            this.endAnimation(callback);
            return;
        }
        
        const counter = this.createAnimationCounter(newTilesCount, callback);
        
        tilesToCreate.forEach(({ row, col, tile }) => {
            const tileNode = this.getTileFromPool();
            const position = this.getTilePosition(row, col);
            
            tileNode.x = position.x;
            tileNode.y = position.y;
            
            const tileView = tileNode.getComponent(TileView);
            if (tileView) {
                tileView.init(tile.type, row, col);
                
                tileNode.off(cc.Node.EventType.TOUCH_END);
                tileNode.on(cc.Node.EventType.TOUCH_END, () => {
                    if (tileView) {
                        this.onTileClicked(tileView.row, tileView.col);
                    }
                });
                
                this._tileViews[row][col] = tileView;
                
                tileView.playNewTileAnimation(counter.decrease);
            } else {
                this.returnTileToPool(tileNode);
                counter.decrease();
            }
        });
    }

    isAnimating(): boolean {
        return this._isAnimating;
    }

    highlightTile(row: number, col: number, highlight: boolean): void {
        const tileView = this._tileViews[row][col];
        if (tileView) {
            if (highlight) {
                tileView.node.scale = 1.2;
                tileView.node.opacity = 200;
            } else {
                tileView.node.scale = 1.0;
                tileView.node.opacity = 255;
            }
        }
    }

    clearHighlights(): void {
        for (let row = 0; row < this._tileViews.length; row++) {
            for (let col = 0; col < this._tileViews[row].length; col++) {
                const tileView = this._tileViews[row][col];
                if (tileView) {
                    tileView.node.scale = 1.0;
                    tileView.node.opacity = 255;
                }
            }
        }
    }

    animateSuperTileCreation(row: number, col: number): void {
        const tile = this._gameBoard.getTile(row, col);
        if (!tile) {
            return;
        }
        
        const tileView = this._tileViews[row][col];
        if (!tileView) {
            return;
        }
        
        tileView.node.zIndex = 10;

        const sequence = cc.sequence(
            cc.scaleTo(0.2, 0),
            cc.callFunc(() => {
                tileView.init(tile.type, row, col);
            }),
            cc.scaleTo(0.3, 1.3).easing(cc.easeBackOut()),
            cc.scaleTo(0.1, 1)
        );
        
        tileView.node.runAction(sequence);
    }
    
    animateTeleport(row1: number, col1: number, row2: number, col2: number, callback?: Function): void {
        this.startAnimation();
        
        const tile1 = this._gameBoard.getTile(row1, col1);
        const tile2 = this._gameBoard.getTile(row2, col2);
        
        if (!tile1 || !tile2) {
            this.endAnimation(callback);
            return;
        }
        
        const tileView1 = this._tileViews[row1][col1];
        const tileView2 = this._tileViews[row2][col2];
        
        if (!tileView1 || !tileView2) {
            this.endAnimation(callback);
            return;
        }
        
        const pos1 = cc.v2(tileView1.node.x, tileView1.node.y);
        const pos2 = cc.v2(tileView2.node.x, tileView2.node.y);
        
        const tempNode1 = cc.instantiate(tileView1.node);
        const tempNode2 = cc.instantiate(tileView2.node);
        
        tempNode1.parent = this.node;
        tempNode2.parent = this.node;
        
        tempNode1.x = pos1.x;
        tempNode1.y = pos1.y;
        tempNode2.x = pos2.x;
        tempNode2.y = pos2.y;
        
        tileView1.node.opacity = 0;
        tileView2.node.opacity = 0;
        
        const teleport1 = cc.sequence(
            cc.scaleTo(0.15, 1.2),
            cc.spawn(
                cc.moveTo(0.3, pos2).easing(cc.easeInOut(2)),
                cc.sequence(
                    cc.fadeTo(0.15, 150),
                    cc.fadeTo(0.15, 255)
                )
            ),
            cc.scaleTo(0.15, 1.0)
        );
        
        const teleport2 = cc.sequence(
            cc.scaleTo(0.15, 1.2),
            cc.spawn(
                cc.moveTo(0.3, pos1).easing(cc.easeInOut(2)),
                cc.sequence(
                    cc.fadeTo(0.15, 150),
                    cc.fadeTo(0.15, 255)
                )
            ),
            cc.scaleTo(0.15, 1.0),
            cc.callFunc(() => {
                tempNode1.removeFromParent(true);
                tempNode2.removeFromParent(true);
                
                tileView1.init(tile1.type, row1, col1);
                tileView2.init(tile2.type, row2, col2);
                
                tileView1.node.opacity = 255;
                tileView2.node.opacity = 255;
                
                this.endAnimation(callback);
            })
        );
        
        tempNode1.runAction(teleport1);
        tempNode2.runAction(teleport2);
    }
    
    animateShuffle(callback?: Function): void {
        if (!this._gameBoard) {
            if (callback) callback();
            return;
        }
        
        this.startAnimation();
        
        const rows = this._gameBoard.rows;
        const cols = this._gameBoard.cols;
        const tileSize = GameConfig.TILE_SIZE;
        
        const tilesToAnimate = [];
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const tileView = this._tileViews[row][col];
                const tile = this._gameBoard.getTile(row, col);
                
                if (tileView && tile) {
                    tileView.init(tile.type, row, col);
                    tilesToAnimate.push(tileView);
                }
            }
        }
        
        if (tilesToAnimate.length === 0) {
            this.endAnimation(callback);
            return;
        }
        
        const counter = this.createAnimationCounter(tilesToAnimate.length, () => {
            this.updateBoard();
            callback && callback();
        });
        
        tilesToAnimate.forEach(tileView => {
            const zIndexValue = Math.floor(Math.random() * 10);
            tileView.node.zIndex = zIndexValue;
            
            const shuffleSequence = cc.sequence(
                cc.scaleTo(0.2, 0),
                cc.scaleTo(0.3, 1.2).easing(cc.easeBackOut()),
                cc.scaleTo(0.1, 1.0),
                cc.callFunc(() => {
                    tileView.node.zIndex = 0;
                    counter.decrease();
                })
            );
            
            tileView.node.runAction(cc.sequence(
                cc.delayTime(Math.random() * 0.3),
                shuffleSequence
            ));
        });
    }
    
    getTileViewAt(row: number, col: number): TileView {
        if (row >= 0 && row < this._tileViews.length && 
            col >= 0 && this._tileViews[row] && col < this._tileViews[row].length) {
            return this._tileViews[row][col];
        }
        return null;
    }
    
    getTileWorldPosition(row: number, col: number): cc.Vec3 {
        const tileView = this.getTileViewAt(row, col);
        if (tileView && tileView.node) {
            return this.node.convertToWorldSpaceAR(tileView.node.position);
        }
        
        const tileSize = GameConfig.TILE_SIZE;
        const rows = this._gameBoard.rows;
        const cols = this._gameBoard.cols;
        
        const boardWidth = cols * tileSize;
        const boardHeight = rows * tileSize;
        
        const startX = -boardWidth / 2 + tileSize / 2;
        const startY = boardHeight / 2 - tileSize / 2;
        
        const localX = startX + col * tileSize;
        const localY = startY - row * tileSize;
        
        const pos = this.node.convertToWorldSpaceAR(cc.v2(localX, localY));
        return cc.v3(pos.x, pos.y, 0);
    }
    
    animateBombFlight(fromPos: cc.Vec3, toPos: cc.Vec3, callback?: Function): void {
        const bombNode = new cc.Node('FlyingBomb');
        bombNode.parent = cc.director.getScene();
        
        const startPos = cc.director.getScene().convertToNodeSpaceAR(fromPos);
        const endPos = cc.director.getScene().convertToNodeSpaceAR(toPos);
        
        bombNode.position = cc.v3(startPos.x, startPos.y, 0);
        
        const sprite = bombNode.addComponent(cc.Sprite);
        sprite.spriteFrame = this.tileSprites[7];
        
        bombNode.width = GameConfig.TILE_SIZE;
        bombNode.height = GameConfig.TILE_SIZE;
        bombNode.zIndex = 1000;
        
        const distance = cc.Vec3.distance(
            cc.v3(startPos.x, startPos.y, 0), 
            cc.v3(endPos.x, endPos.y, 0)
        );
        const duration = Math.min(0.8, 0.3 + distance / 2000);
        
        const midPoint = cc.v3(
            (startPos.x + endPos.x) / 2,
            Math.max(startPos.y, endPos.y) + 200,
            0
        );
        
        const bezierPoints = [
            cc.v2((startPos.x + midPoint.x) / 2, midPoint.y),
            cc.v2((midPoint.x + endPos.x) / 2, midPoint.y),
            cc.v2(endPos.x, endPos.y)
        ];
        
        const bezierAction = cc.bezierTo(duration, bezierPoints);
        
        const rotateAction = cc.rotateBy(duration, 360);
        
        const sequence = cc.sequence(
            cc.spawn(bezierAction, rotateAction),
            cc.callFunc(() => {
                if (callback) {
                    callback();
                }
                
                const pulseAction = cc.sequence(
                    cc.scaleTo(0.2, 1.2),
                    cc.scaleTo(0.2, 1.0)
                ).repeat(2);
                
                bombNode.runAction(pulseAction);
                
                this.scheduleOnce(() => {
                    bombNode.runAction(cc.sequence(
                        cc.spawn(
                            cc.scaleTo(0.2, 2.0),
                            cc.fadeOut(0.2)
                        ),
                        cc.callFunc(() => {
                            bombNode.removeFromParent(true);
                        })
                    ));
                }, 0.8);
            })
        );
        
        bombNode.runAction(sequence);
    }
}
