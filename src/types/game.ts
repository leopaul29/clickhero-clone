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
    persistentData: PersistentState;

    monsterData: {
        currentMonster: Monster;
        monsterLife: number;
    };
    combatData: {
        isAttacking: boolean;
        combatLog: string[];
    };
    actions: {
        attackMonster: () => void;
        applyDps: () => void;
        buyBonus: (bonus: Bonus) => void;
        clearProgress: () => void;
    };
}

export interface PersistentState {
    gold: number;
    power: number;
    dps: number;
    bonuses: Bonus[];
    currentMonsterId: number;
}