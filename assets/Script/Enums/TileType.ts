export enum TileType {
    BLUE,
    GREEN,
    PURPLE,
    RED,
    YELLOW,

    SUPER_ROW,
    SUPER_COLUMN,
    SUPER_BOMB,
    SUPER_TNT
}

export function isRegularTile(type: TileType): boolean {
    return type <= TileType.YELLOW;
}

export function isSuperTile(type: TileType): boolean {
    return type >= TileType.SUPER_ROW && type <= TileType.SUPER_TNT;
}

export function getRandomTileType(): TileType {
    const regularTileTypes: TileType[] = [
        TileType.BLUE,
        TileType.GREEN,
        TileType.PURPLE,
        TileType.RED,
        TileType.YELLOW
    ];
    
    const randomIndex = Math.floor(Math.random() * regularTileTypes.length);
    return regularTileTypes[randomIndex];
}

export function getRandomSuperTileType(): TileType {
    const superTileTypes: TileType[] = [
        TileType.SUPER_ROW,
        TileType.SUPER_COLUMN,
        TileType.SUPER_BOMB,
        TileType.SUPER_TNT
    ];
    
    const randomIndex = Math.floor(Math.random() * superTileTypes.length);
    return superTileTypes[randomIndex];
}
