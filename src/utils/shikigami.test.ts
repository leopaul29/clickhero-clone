import {describe, expect, it} from 'vitest';
import {
    awakenings, baseDps, copiesForNextLevel, LEVELS_PER_AWAKENING, recordCatch, shikigamiDps,
    speciesKey, totalDps,
} from './shikigami.ts';
import {asMonster} from '../test/collection.ts';
import type {ShikigamiCollection} from '../types/game.ts';

/** Catch the same creature `times` over, which is what levelling actually costs. */
const catchRepeatedly = (times: number, depth = 1): ShikigamiCollection => {
    let collection: ShikigamiCollection = {};
    for (let i = 0; i < times; i++) {
        collection = recordCatch(collection, asMonster({depth})).collection;
    }
    return collection;
};

describe('species identity', () => {
    it('ignores case and surrounding space, so a second Kappa is a duplicate', () => {
        expect(speciesKey('  Kappa ')).toBe(speciesKey('kappa'));
    });

    it('keeps a ranked variant apart from the base creature', () => {
        expect(speciesKey('Elder Yuki-onna')).not.toBe(speciesKey('Yuki-onna'));
    });
});

describe('damage', () => {
    it('grows with the depth it was sealed at', () => {
        expect(baseDps(20)).toBeGreaterThan(baseDps(10));
        expect(baseDps(10)).toBeGreaterThan(baseDps(1));
    });

    it('is never zero, so even the first catch does something', () => {
        expect(baseDps(1)).toBeGreaterThanOrEqual(1);
    });

    it('scales with the level', () => {
        const one = {key: 'k', name: 'K', nameJp: 'K', emoji: '🐸', depth: 4, level: 1, copies: 0};
        expect(shikigamiDps({...one, level: 3})).toBe(shikigamiDps(one) * 3);
    });

    it('adds up across the collection', () => {
        const collection = {
            a: {key: 'a', name: 'A', nameJp: 'A', emoji: '🐸', depth: 1, level: 2, copies: 0},
            b: {key: 'b', name: 'B', nameJp: 'B', emoji: '👺', depth: 6, level: 1, copies: 0},
        };
        expect(totalDps(collection)).toBe(baseDps(1) * 2 + baseDps(6));
    });

    it('is zero before anything is caught', () => {
        expect(totalDps({})).toBe(0);
    });
});

describe('recordCatch', () => {
    it('enters a new species at level one', () => {
        const {collection, entry, isFirst} = recordCatch({}, asMonster());

        expect(isFirst).toBe(true);
        expect(entry.level).toBe(1);
        expect(entry.copies).toBe(0);
        expect(Object.keys(collection)).toHaveLength(1);
    });

    it('keeps the flavour of the creature that was actually sealed', () => {
        const {entry} = recordCatch({}, asMonster({name: 'Nue', nameJp: '鵺', emoji: '🌑', depth: 9}));

        expect(entry).toMatchObject({name: 'Nue', nameJp: '鵺', emoji: '🌑', depth: 9});
    });

    // A generated creature lives in a per-session cache. If the entry pointed at the
    // bestiary instead of copying the flavour, a reload would blank the codex.
    it('does not add a second entry for a duplicate', () => {
        const collection = catchRepeatedly(3);
        expect(Object.keys(collection)).toHaveLength(1);
    });

    it('fixes the strength at the depth of the first catch, not the latest', () => {
        const first = recordCatch({}, asMonster({depth: 2})).collection;
        const {entry} = recordCatch(first, asMonster({depth: 30}));

        expect(entry.depth).toBe(2);
    });

    it('leaves the original collection untouched', () => {
        const before = recordCatch({}, asMonster()).collection;
        const snapshot = JSON.stringify(before);

        recordCatch(before, asMonster());

        expect(JSON.stringify(before)).toBe(snapshot);
    });
});

describe('levelling', () => {
    it('costs N duplicates to reach level N+1', () => {
        expect(copiesForNextLevel(1)).toBe(1);
        expect(copiesForNextLevel(4)).toBe(4);
    });

    // Triangular: reaching level N takes 1 + N(N-1)/2 catches in total.
    it.each([[1, 1], [2, 2], [4, 3], [7, 4], [11, 5], [29, 8]])(
        '%s catches reaches level %s', (catches, level) => {
            const collection = catchRepeatedly(catches);
            expect(Object.values(collection)[0].level).toBe(level);
        });

    it('banks the leftovers toward the next level', () => {
        // Level 2 is reached on the second catch; the third is one of the two needed for level 3.
        const collection = catchRepeatedly(3);
        const entry = Object.values(collection)[0];

        expect(entry.level).toBe(2);
        expect(entry.copies).toBe(1);
    });

    it('reports a 覚醒 only on the catch that crosses it', () => {
        let collection: ShikigamiCollection = {};
        const awakened: number[] = [];

        for (let i = 1; i <= 11; i++) {
            const result = recordCatch(collection, asMonster());
            collection = result.collection;
            if (result.isAwakening) awakened.push(i);
        }

        // Level 5 is reached on the eleventh catch, and that is the first awakening.
        expect(awakened).toEqual([11]);
        expect(awakenings(Object.values(collection)[0].level)).toBe(1);
    });

    it.each([[1, 0], [4, 0], [5, 1], [9, 1], [10, 2]])(
        'level %s has %s awakenings', (level, expected) => {
            expect(awakenings(level)).toBe(expected);
        });

    it('awakens every LEVELS_PER_AWAKENING levels', () => {
        expect(awakenings(LEVELS_PER_AWAKENING)).toBe(1);
        expect(awakenings(LEVELS_PER_AWAKENING * 3)).toBe(3);
    });
});
