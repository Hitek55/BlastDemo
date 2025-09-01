export enum BoosterType {
    BOMB,
    TELEPORT
}

export function isValidBooster(type: BoosterType): boolean {
    return type >= BoosterType.BOMB && type <= BoosterType.TELEPORT;
}
