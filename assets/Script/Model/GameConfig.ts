
export class GameConfig {

    static readonly GRID_ROWS: number = 9;
    static readonly GRID_COLS: number = 9;
    
    static readonly TILE_SIZE: number = 64;
    
    static readonly TARGET_SCORE: number = 5000;
    static readonly MAX_MOVES: number = 30;
    static readonly BOMB_BOOSTERS_COUNT: number = 5;
    static readonly TELEPORT_BOOSTERS_COUNT: number = 5;
    
    static readonly MIN_TILES_TO_BLAST: number = 2; 
    
    static readonly MAX_SHUFFLES: number = 3;
    
    static readonly BOMB_RADIUS: number = 2;
    
    static readonly TILE_COUNT_FOR_SUPER_TILE: number = 4;

    static getScoreForTiles(tileCount: number): number {
        //return Math.pow(tileCount, 2);
        return tileCount * 10;
    }
}
