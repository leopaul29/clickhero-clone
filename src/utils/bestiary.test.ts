import {describe, expect, it} from 'vitest';
import {
    clampDepth, GOLD_GROWTH, HANDCRAFTED_DEPTH, LIFE_GROWTH, monsterAt, proceduralFlavor, scaleStats,
} from './bestiary.ts';
import {MONSTERS} from '../data/monsters.ts';
import {YOKAI_POOL} from '../data/yokai.ts';

describe('clampDepth', () => {
    it.each([[0, 1], [-5, 1], [1.9, 1], [7, 7]])('maps %s to %s', (input, expected) => {
        expect(clampDepth(input)).toBe(expected);
    });

    it('survives a corrupt save', () => {
        expect(clampDepth(Number.NaN)).toBe(1);
        expect(clampDepth(Number.POSITIVE_INFINITY)).toBe(1);
    });
});

describe('scaleStats', () => {
    it('uses the handcrafted numbers for the opening act', () => {
        MONSTERS.forEach((monster, index) => {
            expect(scaleStats(index + 1)).toEqual({life: monster.life, goldReward: monster.goldReward});
        });
    });

    it('grows from the last handcrafted monster', () => {
        const last = MONSTERS[HANDCRAFTED_DEPTH - 1];
        expect(scaleStats(HANDCRAFTED_DEPTH + 1)).toEqual({
            life: Math.round(last.life * LIFE_GROWTH),
            goldReward: Math.round(last.goldReward * GOLD_GROWTH),
        });
    });

    it('never stops growing', () => {
        for (let depth = HANDCRAFTED_DEPTH; depth < 60; depth++) {
            expect(scaleStats(depth + 1).life).toBeGreaterThan(scaleStats(depth).life);
        }
    });

    it('stays a finite integer deep down, where a runaway curve would overflow', () => {
        const deep = scaleStats(120);
        expect(Number.isFinite(deep.life)).toBe(true);
        expect(Number.isInteger(deep.life)).toBe(true);
        expect(deep.goldReward).toBeGreaterThan(0);
    });
});

describe('proceduralFlavor', () => {
    it('is deterministic — the same depth is always the same creature', () => {
        expect(proceduralFlavor(9)).toEqual(proceduralFlavor(9));
    });

    it('walks the pool in order past the handcrafted opening', () => {
        expect(proceduralFlavor(HANDCRAFTED_DEPTH + 1).name).toBe(YOKAI_POOL[0].name);
        expect(proceduralFlavor(HANDCRAFTED_DEPTH + 2).name).toBe(YOKAI_POOL[1].name);
    });

    it('ranks up rather than repeating once the pool is exhausted', () => {
        const first = proceduralFlavor(HANDCRAFTED_DEPTH + 1);
        const secondLap = proceduralFlavor(HANDCRAFTED_DEPTH + 1 + YOKAI_POOL.length);

        expect(secondLap.name).not.toBe(first.name);
        expect(secondLap.name).toContain(first.name);
        expect(secondLap.nameJp).toContain(first.nameJp);
    });

    it('always produces a non-empty name, however deep', () => {
        for (const depth of [6, 50, 500, 5_000]) {
            const flavor = proceduralFlavor(depth);
            expect(flavor.name.length).toBeGreaterThan(0);
            expect(flavor.nameJp.length).toBeGreaterThan(0);
            expect(flavor.emoji.length).toBeGreaterThan(0);
        }
    });
});

describe('monsterAt', () => {
    it('marks the opening act handcrafted', () => {
        expect(monsterAt(1).origin).toBe('handcrafted');
        expect(monsterAt(1).name).toBe(MONSTERS[0].name);
    });

    it('falls back to the procedural bestiary with no flavour', () => {
        const monster = monsterAt(HANDCRAFTED_DEPTH + 1);
        expect(monster.origin).toBe('procedural');
        expect(monster.name).toBe(YOKAI_POOL[0].name);
    });

    it('uses generated flavour when given some', () => {
        const flavor = {name: 'Hone-onna', nameJp: '骨女', emoji: '🩻', description: 'Bone woman'};
        const monster = monsterAt(HANDCRAFTED_DEPTH + 1, flavor);

        expect(monster.origin).toBe('generated');
        expect(monster.name).toBe('Hone-onna');
    });

    // Flavour is cosmetic; the curve is the game's. A model cannot move balance.
    it('gives identical stats whatever the flavour', () => {
        const flavor = {name: 'X', nameJp: 'X', emoji: 'X', description: 'X'};
        const generated = monsterAt(30, flavor);
        const procedural = monsterAt(30);

        expect(generated.life).toBe(procedural.life);
        expect(generated.goldReward).toBe(procedural.goldReward);
    });

    it('starts every monster at full life', () => {
        for (const depth of [1, 5, 6, 40]) {
            expect(monsterAt(depth).life).toBe(monsterAt(depth).maxLife);
        }
    });

    it('ignores flavour inside the handcrafted opening', () => {
        const flavor = {name: 'Impostor', nameJp: '偽', emoji: '❓', description: 'nope'};
        expect(monsterAt(1, flavor).name).toBe(MONSTERS[0].name);
    });
});
