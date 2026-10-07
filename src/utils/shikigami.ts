import type {Monster, Shikigami, ShikigamiCollection} from "../types/game.ts";
import {clampDepth, scaleStats} from "./bestiary.ts";

/**
 * How much of a depth's life a shikigami caught there deals per second.
 *
 * Tied to the life curve rather than given a curve of its own, so the collection keeps
 * pace with the descent automatically. A player holding most of what they have met does
 * roughly `life / 7` per second — an idle kill every few seconds, at every depth, with
 * one constant instead of a table.
 */
export const SHIKIGAMI_LIFE_DIVISOR = 20;

/** Levels per 覚醒. Awakening is a visual tier and a log line, not extra damage. */
export const LEVELS_PER_AWAKENING = 5;

/**
 * Species identity. Two creatures with the same name are the same species, so the
 * second one is a duplicate — which is what makes a depth worth revisiting.
 */
export const speciesKey = (name: string): string => name.trim().toLowerCase();

export const baseDps = (depth: number): number =>
    Math.max(1, Math.round(scaleStats(clampDepth(depth)).life / SHIKIGAMI_LIFE_DIVISOR));

export const shikigamiDps = (entry: Shikigami): number =>
    baseDps(entry.depth) * Math.max(1, entry.level);

/** The player's whole automatic damage output. The only source of it there is. */
export const totalDps = (collection: ShikigamiCollection): number =>
    Object.values(collection).reduce((sum, entry) => sum + shikigamiDps(entry), 0);

export const awakenings = (level: number): number =>
    Math.floor(Math.max(1, level) / LEVELS_PER_AWAKENING);

/** Duplicates needed to reach the next level: 1, 2, 3, … — triangular, so it soft-caps itself. */
export const copiesForNextLevel = (level: number): number => Math.max(1, level);

interface CatchResult {
    collection: ShikigamiCollection;
    entry: Shikigami;
    isFirst: boolean;
    isAwakening: boolean;
}

/**
 * Add one catch to the collection.
 *
 * A first catch enters at level 1. A duplicate banks a copy and spends it immediately —
 * levelling is automatic because there is no trade-off to decide: a player would always
 * level, so asking them to press a button would be ceremony, not a choice.
 */
export function recordCatch(collection: ShikigamiCollection, monster: Monster): CatchResult {
    const key = speciesKey(monster.name);
    const existing = collection[key];

    if (!existing) {
        const entry: Shikigami = {
            key,
            name: monster.name,
            nameJp: monster.nameJp,
            emoji: monster.emoji,
            depth: monster.depth,
            level: 1,
            copies: 0,
        };
        return {collection: {...collection, [key]: entry}, entry, isFirst: true, isAwakening: false};
    }

    let {level, copies} = existing;
    copies += 1;

    while (copies >= copiesForNextLevel(level)) {
        copies -= copiesForNextLevel(level);
        level += 1;
    }

    const entry: Shikigami = {...existing, level, copies};

    return {
        collection: {...collection, [key]: entry},
        entry,
        isFirst: false,
        isAwakening: awakenings(level) > awakenings(existing.level),
    };
}
