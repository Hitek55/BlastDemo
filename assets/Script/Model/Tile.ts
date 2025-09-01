import { TileType, isRegularTile, isSuperTile } from "../Enums/TileType";

export class Tile {
    private _type: TileType;
    private _row: number;
    private _col: number;
    private _isMarkedForRemoval: boolean = false;
    private _isSelected: boolean = false;

    constructor(type: TileType, row: number, col: number) {
        this._type = type;
        this._row = row;
        this._col = col;
    }

    get type(): TileType {
        return this._type;
    }

    set type(value: TileType) {
        this._type = value;
    }

    get row(): number {
        return this._row;
    }

    set row(value: number) {
        this._row = value;
    }

    get col(): number {
        return this._col;
    }

    set col(value: number) {
        this._col = value;
    }

    get isMarkedForRemoval(): boolean {
        return this._isMarkedForRemoval;
    }

    set isMarkedForRemoval(value: boolean) {
        this._isMarkedForRemoval = value;
    }

    get isSelected(): boolean {
        return this._isSelected;
    }

    set isSelected(value: boolean) {
        this._isSelected = value;
    }

    isRegular(): boolean {
        return isRegularTile(this._type);
    }

    isSuperTile(): boolean {
        return isSuperTile(this._type);
    }

    isSameType(otherTile: Tile): boolean {
        if (this.isRegular() && otherTile.isRegular()) {
            return this._type === otherTile.type;
        }
        return false;
    }

    convertToSuperTile(superTileType: TileType): void {
        if (isSuperTile(superTileType)) {
            this._type = superTileType;
        }
    }
}
