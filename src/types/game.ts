export interface Monster {
    id:number,
    name: string,
    life: number,
    gold: number,
}

export interface Bonus {
    name: string;
    description: string;
    power: number;
    level: number;
    cost: number;
}

export interface GameContextType {
    gold: number;
    power: number;
    dps: number;
    monster: Monster;
    attackMonster: () => void;
    applyDps: () => void;
    buyBonus: (bonus: Bonus) => void;
}
