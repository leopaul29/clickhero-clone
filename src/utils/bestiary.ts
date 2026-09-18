import type {Monster, MonsterFlavor} from "../types/game.ts";
import {MONSTERS} from "../data/monsters.ts";
import {RANKS, YOKAI_POOL} from "../data/yokai.ts";

/** Depths 1..N are the handcrafted opening; everything past it is endless. */
export const HANDCRAFTED_DEPTH = MONSTERS.length;

/**
 * Per-depth growth past the handcrafted opening.
 *
 * Stats are the game's business, never the model's: if a language model picked
 * the numbers, balance would change every run and no test could pin it down.
 * The model only supplies flavour. Tune the curve here, in one place.
 */
export const LIFE_GROWTH = 1.35;
export const GOLD_GROWTH = 1.25;

export const clampDepth = (depth: number): number =>
    Number.isFinite(depth) && depth >= 1 ? Math.floor(depth) : 1;

export function scaleStats(depth: number): { life: number; goldReward: number } {
    const d = clampDepth(depth);

    if (d <= HANDCRAFTED_DEPTH) {
        const handcrafted = MONSTERS[d - 1];
        return {life: handcrafted.life, goldReward: handcrafted.goldReward};
    }

    const last = MONSTERS[HANDCRAFTED_DEPTH - 1];
    const steps = d - HANDCRAFTED_DEPTH;

    return {
        life: Math.round(last.life * Math.pow(LIFE_GROWTH, steps)),
        goldReward: Math.round(last.goldReward * Math.pow(GOLD_GROWTH, steps)),
    };
}

/**
 * The creature waiting at a depth when nothing has been generated for it.
 * Deterministic, so the same depth always yields the same monster.
 */
export function proceduralFlavor(depth: number): MonsterFlavor {
    const d = clampDepth(depth);
    const index = (d - HANDCRAFTED_DEPTH - 1) % YOKAI_POOL.length;
    const lap = Math.floor((d - HANDCRAFTED_DEPTH - 1) / YOKAI_POOL.length);

    const base = YOKAI_POOL[index];
    const rank = RANKS[Math.min(lap, RANKS.length - 1)];

    return {
        name: rank.prefix ? `${rank.prefix} ${base.name}` : base.name,
        nameJp: `${rank.prefixJp}${base.nameJp}`,
        emoji: base.emoji,
        description: base.description,
    };
}

/** Build the monster for a depth, using supplied flavour when there is any. */
export function monsterAt(depth: number, flavor?: MonsterFlavor | null): Monster {
    const d = clampDepth(depth);
    const {life, goldReward} = scaleStats(d);

    if (d <= HANDCRAFTED_DEPTH) {
        const handcrafted = MONSTERS[d - 1];
        return {...handcrafted, depth: d, life, maxLife: life, goldReward, origin: 'handcrafted'};
    }

    return {
        ...(flavor ?? proceduralFlavor(d)),
        depth: d,
        life,
        maxLife: life,
        goldReward,
        origin: flavor ? 'generated' : 'procedural',
    };
}
