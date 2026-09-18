/** What buying a bonus actually improves. Drives game logic — never the array order. */
export type BonusEffect = 'power' | 'dps' | 'goldMultiplier';

export interface Monster {
    id: number,
    name: string,
    nameJp: string,
    life: number,
    maxLife: number,
    goldReward: number,
    emoji: string,
    description: string,
}

export interface Bonus {
    id: number,
    name: string;
    nameJp: string,
    description: string;
    icon: string,
    /** Which stat this bonus raises. Replaces the old `id === 1` / `id === 2` branching. */
    effect: BonusEffect,
    power: number;
    level: number;
    cost: number;
}

/** Everything worth writing to localStorage. */
export interface PersistentState {
    gold: number;
    power: number;
    dps: number;
    bonuses: Bonus[];
    currentMonsterId: number;
    monsterLife: number;
}

/** Persistent state plus the session-only bits that are not worth saving. */
export interface GameState extends PersistentState {
    isAttacking: boolean;
    combatLog: string[];
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
