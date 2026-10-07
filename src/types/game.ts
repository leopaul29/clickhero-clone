/** What buying a bonus actually improves. Drives game logic — never the array order. */
export type BonusEffect = 'power' | 'goldMultiplier';

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

/**
 * A sealed yōkai serving the player — the game's only source of automatic damage.
 *
 * Flavour is copied in rather than looked up, because a generated creature lives in a
 * per-session cache: the entry has to survive a reload that never regenerates it.
 */
export interface Shikigami {
    /** Species identity, derived from the name so a second Kappa is a duplicate. */
    key: string,
    name: string,
    nameJp: string,
    emoji: string,
    /** The depth it was first sealed at, which sets how hard it hits. */
    depth: number,
    /** 1 on the first catch; duplicates raise it. */
    level: number,
    /** Duplicates banked toward the next level. */
    copies: number,
}

/** The collection, keyed by species so duplicates land on the same entry. */
export type ShikigamiCollection = Record<string, Shikigami>;

/** Everything worth writing to localStorage. */
export interface PersistentState {
    gold: number;
    power: number;
    bonuses: Bonus[];
    depth: number;
    monsterLife: number;
    /** 御札 — talismans held. Spent one per seal. */
    ofuda: number;
    /** 手加減 — restraint. While on, nothing the player does can land a killing blow. */
    tekagen: boolean;
    shikigami: ShikigamiCollection;
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

/** The most recent seal, on the same fresh-id-per-event basis as `Hit`. */
export interface Seal {
    id: number,
    nameJp: string,
    emoji: string,
    level: number,
    /** True when this catch was the species' first — the codex beat. */
    isFirst: boolean,
    /** True when this catch crossed a 覚醒 threshold. */
    isAwakening: boolean,
}

/** Persistent state plus the session-only bits that are not worth saving. */
export interface GameState extends PersistentState {
    isAttacking: boolean;
    combatLog: string[];
    lastHit: Hit | null;
    lastSeal: Seal | null;
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
        lastSeal: Seal | null;
    };
    /** Derived from the collection and the fight in progress — never stored. */
    captureData: {
        dps: number;
        /** Life at or below which the yōkai can be sealed. */
        sealThreshold: number;
        canSeal: boolean;
        ofudaCost: number;
    };
    actions: {
        attackMonster: () => void;
        applyDps: () => void;
        buyBonus: (bonus: Bonus) => void;
        buyOfuda: () => void;
        sealMonster: () => void;
        toggleTekagen: () => void;
        clearProgress: () => void;
    };
}
