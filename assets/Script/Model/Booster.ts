import { BoosterType } from "../Enums/BoosterType";

export class Booster {
    private _type: BoosterType;
    private _row: number;
    private _col: number;

    constructor(type: BoosterType, row: number, col: number) {
        this._type = type;
        this._row = row;
        this._col = col;
    }

    get type(): BoosterType {
        return this._type;
    }

    set type(value: BoosterType) {
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
}
