/** What buying a bonus actually improves. Drives game logic — never the array order. */
export type BonusEffect = 'power' | 'dps' | 'goldMultiplier';

/** Where a monster's flavour came from. Stats are always computed by the game. */
export type MonsterOrigin = 'handcrafted' | 'generated' | 'procedural';

/** The part of a monster a language model is allowed to invent. */
export interface MonsterFlavor {
    name: string,
    nameJp: string,
    emoji: string,
    description: string,
}

/** A hand-written monster from the opening act; its depth is its position in the list. */
export interface HandcraftedMonster extends MonsterFlavor {
    life: number,
    goldReward: number,
}

export interface Monster extends MonsterFlavor {
    /** How far down the player is. Also the monster's identity — 1, 2, 3, … forever. */
    depth: number,
    life: number,
    maxLife: number,
    goldReward: number,
    origin: MonsterOrigin,
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
    depth: number;
    monsterLife: number;
}

/**
 * The most recent blow, kept so the UI can animate it.
 *
 * `id` increments on every hit: two identical hits in a row still produce a new
 * object, which is what lets a repeated 5-damage click replay its animation
 * instead of the DOM deciding nothing changed.
 */
export interface Hit {
    id: number,
    amount: number,
    isCrit: boolean,
    killed: boolean,
    /** Which hand dealt it — a per-second tick must not sound like a click. */
    source: 'click' | 'dps',
}

/** Persistent state plus the session-only bits that are not worth saving. */
export interface GameState extends PersistentState {
    isAttacking: boolean;
    combatLog: string[];
    lastHit: Hit | null;
}

export interface GameContextType {
    persistentData: PersistentState;

    monsterData: {
        currentMonster: Monster;
        monsterLife: number;
        depth: number;
    };
    combatData: {
        isAttacking: boolean;
        combatLog: string[];
        lastHit: Hit | null;
    };
    actions: {
        attackMonster: () => void;
        applyDps: () => void;
        buyBonus: (bonus: Bonus) => void;
        clearProgress: () => void;
    };
}
