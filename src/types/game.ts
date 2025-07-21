export interface Monster {
    id:number,
    name: string,
    nameJp: string,
    life: number,
    maxLife: number,
    goldReward: number,
    emoji:string,
    description: string,
}

export interface Bonus {
    id:number,
    name: string;
    nameJp: string,
    description: string;
    icon: string,
    power: number;
    level: number;
    cost: number;
}

export interface GameContextType {
    gold: number;
    power: number;
    dps: number;
    currentMonster: Monster;
    isAttacking: boolean;
    attackMonster: () => void;
    applyDps: () => void;
    bonuses: Bonus[];
    buyBonus: (bonus: Bonus) => void;
    combatLog: string[];
    clearProgress: () => void;
}
