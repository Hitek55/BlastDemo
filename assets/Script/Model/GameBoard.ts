
import { Tile } from "./Tile";
import { TileType, getRandomTileType, getRandomSuperTileType, isRegularTile } from "../Enums/TileType";
import { GameConfig } from "./GameConfig";
import { ExplosionType } from "../Enums/ExplosionType";

export class GameBoard {
    private _grid: Tile[][];
    private _rows: number;
    private _cols: number;
    private _selectedTile: Tile = null;


    constructor(rows: number = GameConfig.GRID_ROWS, cols: number = GameConfig.GRID_COLS) {
        this._rows = rows;
        this._cols = cols;
        this._grid = [];
        
        this.initializeGrid();
    }

    get grid(): Tile[][] {
        return this._grid;
    }

    get rows(): number {
        return this._rows;
    }

    get cols(): number {
        return this._cols;
    }

    get selectedTile(): Tile {
        return this._selectedTile;
    }

    set selectedTile(tile: Tile) {
        if (this._selectedTile) {
            this._selectedTile.isSelected = false;
        }
        
        this._selectedTile = tile;
        
        if (this._selectedTile) {
            this._selectedTile.isSelected = true;
        }
    }

    private initializeGrid(): void {
        this._grid = [];
        
        for (let row = 0; row < this._rows; row++) {
            this._grid[row] = [];
            
            for (let col = 0; col < this._cols; col++) {
                const tileType = getRandomTileType();
                this._grid[row][col] = new Tile(tileType, row, col);
            }
        }
        
        //this.addInitialSuperTiles();
    }
    
    private addInitialSuperTiles(): void {
        const superTileTypes = [
            TileType.SUPER_ROW,
            TileType.SUPER_COLUMN,
            TileType.SUPER_BOMB,
            TileType.SUPER_TNT
        ];
        
        for (const superTileType of superTileTypes) {
            let placed = false;
            
            while (!placed) {
                const row = Math.floor(Math.random() * this._rows);
                const col = Math.floor(Math.random() * this._cols);
                
                const tile = this._grid[row][col];
                if (tile && isRegularTile(tile.type)) {
                    this._grid[row][col] = new Tile(superTileType, row, col);
                  
                    placed = true;
                }
            }
        }
    }

    getTile(row: number, col: number): Tile {
        if (this.isValidPosition(row, col)) {
            return this._grid[row][col];
        }
        return null;
    }

    isValidPosition(row: number, col: number): boolean {
        return row >= 0 && row < this._rows && col >= 0 && col < this._cols;
    }

    findConnectedTiles(row: number, col: number): Tile[] {
        const startTile = this.getTile(row, col);
        if (!startTile || !startTile.isRegular()) {
            return [];
        }

        const connectedTiles: Tile[] = [];
        const visited: boolean[][] = Array(this._rows).fill(0).map(() => Array(this._cols).fill(false));
        
        const findConnected = (r: number, c: number) => {
            if (!this.isValidPosition(r, c) || visited[r][c]) {
                return;
            }

            const currentTile = this.getTile(r, c);
            if (!currentTile || !startTile.isSameType(currentTile)) {
                return;
            }

            visited[r][c] = true;
            connectedTiles.push(currentTile);

            const directions = [
                {dr: -1, dc: 0},
                {dr: 0, dc: 1},
                {dr: 1, dc: 0},
                {dr: 0, dc: -1}
            ];
            
            for (const dir of directions) {
                findConnected(r + dir.dr, c + dir.dc);
            }
        };

        findConnected(row, col);
        return connectedTiles;
    }

    removeTiles(tiles: Tile[]): void {
        tiles.forEach(tile => {
            if (this.isValidPosition(tile.row, tile.col)) {
                this._grid[tile.row][tile.col] = null;
            }
        });
    }

    applyGravity(): void {
        for (let col = 0; col < this._cols; col++) {
            let emptyRow = -1;
            
            for (let row = this._rows - 1; row >= 0; row--) {
                if (this._grid[row][col] === null) {
                    if (emptyRow === -1) {
                        emptyRow = row;
                    }
                } else if (emptyRow !== -1) {
                    const tile = this._grid[row][col];
                    this._grid[emptyRow][col] = tile;
                    this._grid[row][col] = null;
                    
                    if (tile) {
                        tile.row = emptyRow;
                    }
                    
                    emptyRow--;
                }
            }
        }
    }

    fillEmptyCells(): void {
        for (let col = 0; col < this._cols; col++) {
            for (let row = 0; row < this._rows; row++) {
                if (this._grid[row][col] === null) {
                    const tileType = getRandomTileType();
                    this._grid[row][col] = new Tile(tileType, row, col);
                }
            }
        }
    }

    hasValidMoves(): boolean {
        for (let row = 0; row < this._rows; row++) {
            for (let col = 0; col < this._cols; col++) {
                const tile = this.getTile(row, col);
                if (tile && tile.isRegular()) {
                    const connectedTiles = this.findConnectedTiles(row, col);
                    if (connectedTiles.length >= GameConfig.MIN_TILES_TO_BLAST) {
                        return true;
                    }
                } else if (tile && (tile.isSuperTile())) {
                    return true;
                }
            }
        }
        return false;
    }

    shuffleGrid(): void {
        const allTiles: Tile[] = [];
        
        for (let row = 0; row < this._rows; row++) {
            for (let col = 0; col < this._cols; col++) {
                const tile = this._grid[row][col];
                if (tile && tile.isRegular()) {
                    allTiles.push(tile);
                }
            }
        }
        
        const types = allTiles.map(tile => tile.type);
        this.shuffleArray(types);
        
        for (let i = 0; i < allTiles.length; i++) {
            allTiles[i].type = types[i];
        }
        
        for (let row = 0; row < this._rows; row++) {
            for (let col = 0; col < this._cols; col++) {
                const tile = this._grid[row][col];
                if (tile) {
                    tile.row = row;
                    tile.col = col;
                }
            }
        }
    }

    private shuffleArray(array: any[]): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    createSuperTile(row: number, col: number): Tile {
        if (!this.isValidPosition(row, col)) {
            return null;
        }
        
        const superTileType = getRandomSuperTileType();
        
        const superTile = new Tile(superTileType, row, col);
        this._grid[row][col] = superTile;
        
        return superTile;
    }

    activateSuperTile(row: number, col: number): Tile[] {
        const tile = this.getTile(row, col);
        if (!tile || !tile.isSuperTile()) {
            return [];
        }
        
        const tilesToRemove: Tile[] = [];
        tilesToRemove.push(tile);
        
        switch (tile.type) {
            case TileType.SUPER_ROW:
                for (let c = 0; c < this._cols; c++) {
                    const rowTile = this.getTile(row, c);
                    if (rowTile && !rowTile.isSuperTile()) {
                        tilesToRemove.push(rowTile);
                    }
                }
                break;
                
            case TileType.SUPER_COLUMN:
                for (let r = 0; r < this._rows; r++) {
                    const colTile = this.getTile(r, col);
                    if (colTile && !colTile.isSuperTile()) {
                        tilesToRemove.push(colTile);
                    }
                }
                break;
                
            case TileType.SUPER_BOMB:
                const radius = GameConfig.BOMB_RADIUS;
                for (let r = row - radius; r <= row + radius; r++) {
                    for (let c = col - radius; c <= col + radius; c++) {
                        if (this.isValidPosition(r, c)) {
                            const radiusTile = this.getTile(r, c);
                            if (radiusTile && !radiusTile.isSuperTile()) {
                                tilesToRemove.push(radiusTile);
                            }
                        }
                    }
                }
                break;
                
            case TileType.SUPER_TNT:
                for (let r = 0; r < this._rows; r++) {
                    for (let c = 0; c < this._cols; c++) {
                        const allTile = this.getTile(r, c);
                        if (allTile && !allTile.isSuperTile()) {
                            tilesToRemove.push(allTile);
                        }
                    }
                }
                break;
        }
        
        return tilesToRemove;
    }

    calculateExplosionWaves(centerRow: number, centerCol: number, explosionType: ExplosionType): Tile[][] {
        const waves: Tile[][] = [];
        
        const activatedTile = this.getTile(centerRow, centerCol);
        if (activatedTile) {
            waves.push([activatedTile]);
        }
        
        let maxDistance: number;
        
        switch (explosionType) {
            case ExplosionType.BOMB:
                maxDistance = Math.max(
                    Math.max(centerRow, this._rows - 1 - centerRow),
                    Math.max(centerCol, this._cols - 1 - centerCol)
                ) + 1;
                return this.calculateBombWaves(waves, centerRow, centerCol, maxDistance);
                
            case ExplosionType.ROW:
                maxDistance = Math.max(centerCol, this._cols - 1 - centerCol);
                return this.calculateRowWaves(waves, centerRow, centerCol, maxDistance);
                
            case ExplosionType.COLUMN:
                maxDistance = Math.max(centerRow, this._rows - 1 - centerRow);
                return this.calculateColumnWaves(waves, centerRow, centerCol, maxDistance);
        }
    }
    
    private calculateBombWaves(waves: Tile[][], centerRow: number, centerCol: number, maxDistance: number): Tile[][] {
        const processed = new Set<string>();
        
        processed.add(`${centerRow}_${centerCol}`);
        
        for (let distance = 0; distance <= maxDistance; distance++) {
            const currentWave: Tile[] = [];
            
            for (let r = 0; r < this._rows; r++) {
                for (let c = 0; c < this._cols; c++) {
                    const tileKey = `${r}_${c}`;
                    
                    if (processed.has(tileKey)) {
                        continue;
                    }
                    
                    const dx = Math.abs(r - centerRow);
                    const dy = Math.abs(c - centerCol);
                    
                    let tileDistance: number = Math.max(dx, dy);
                    
                    if (tileDistance === distance) {
                        const tile = this.getTile(r, c);
                        if (tile && !tile.isSuperTile()) {
                            currentWave.push(tile);
                            processed.add(tileKey);
                        } else if (tile && tile.isSuperTile()) {
                            processed.add(tileKey);
                        }
                    }
                }
            }
            
            if (currentWave.length > 0) {
                waves.push(currentWave);
            }
        }
        
        return waves;
    }
    
    private calculateRowWaves(waves: Tile[][], centerRow: number, centerCol: number, maxDistance: number): Tile[][] {
        const processed = new Set<number>();
        
        processed.add(centerCol);
        
        for (let distance = 0; distance <= maxDistance; distance++) {
            const currentWave: Tile[] = [];
            
            for (let c = 0; c < this._cols; c++) {
                if (processed.has(c)) {
                    continue;
                }
                
                const colDistance = Math.abs(c - centerCol);
                
                if (colDistance === distance) {
                    const tile = this.getTile(centerRow, c);
                    if (tile && !tile.isSuperTile()) {
                        currentWave.push(tile);
                        processed.add(c);
                    } else if (tile && tile.isSuperTile()) {
                        processed.add(c);
                    }
                }
            }
            
            if (currentWave.length > 0) {
                waves.push(currentWave);
            }
        }
        
        return waves;
    }
    
    private calculateColumnWaves(waves: Tile[][], centerRow: number, centerCol: number, maxDistance: number): Tile[][] {
        const processed = new Set<number>();
        
        processed.add(centerRow);
        
        for (let distance = 0; distance <= maxDistance; distance++) {
            const currentWave: Tile[] = [];
            
            for (let r = 0; r < this._rows; r++) {
                if (processed.has(r)) {
                    continue;
                }
                
                const rowDistance = Math.abs(r - centerRow);
                
                if (rowDistance === distance) {
                    const tile = this.getTile(r, centerCol);
                    if (tile && !tile.isSuperTile()) {
                        currentWave.push(tile);
                        processed.add(r);
                    } else if (tile && tile.isSuperTile()) {
                        processed.add(r);
                    }
                }
            }
            
            if (currentWave.length > 0) {
                waves.push(currentWave);
            }
        }
        
        return waves;
    }

    activateBombBooster(row: number, col: number): Tile[] {
        const tilesToRemove: Tile[] = [];
        const radius = GameConfig.BOMB_RADIUS;
        
        for (let r = row - radius; r <= row + radius; r++) {
            for (let c = col - radius; c <= col + radius; c++) {
                if (this.isValidPosition(r, c)) {
                    const tile = this.getTile(r, c);
                    if (tile) {
                        tilesToRemove.push(tile);
                    }
                }
            }
        }
        
        return tilesToRemove;
    }

    selectTileForTeleport(row: number, col: number): boolean {
        const tile = this.getTile(row, col);
        if (!tile || tile.isSuperTile()) {
            return false;
        }
        
        this.selectedTile = tile;
        return true;
    }

    teleportTiles(row: number, col: number): boolean {
        if (!this._selectedTile) {
            return false;
        }
        
        const targetTile = this.getTile(row, col);
        if (!targetTile || targetTile.isSuperTile()) {
            return false;
        }
        
        if (this._selectedTile.row === row && this._selectedTile.col === col) {
            return false;
        }
        
        const selectedRow = this._selectedTile.row;
        const selectedCol = this._selectedTile.col;
        
        this._grid[selectedRow][selectedCol] = targetTile;
        this._grid[row][col] = this._selectedTile;
        
        targetTile.row = selectedRow;
        targetTile.col = selectedCol;
        this._selectedTile.row = row;
        this._selectedTile.col = col;
        
        this.selectedTile = null;
        
        return true;
    }

    findFreePositionForBooster(): any {
        for (let row = 0; row < this._rows; row++) {
            for (let col = 0; col < this._cols; col++) {
                const tile = this.getTile(row, col);
                if (!tile || tile.isRegular()) {
                    return { row, col };
                }
            }
        }
        return null;
    }
}
