import {describe, expect, it} from 'vitest';
import {calculateReward, findBonusByEffect, getMonsterById, getNextMonsterId, updateBonusesStats} from './gameLogic.ts';
import {BONUSES, MONSTERS} from '../data/monsters.ts';
import type {Bonus} from '../types/game.ts';

const bonus = (over: Partial<Bonus> = {}): Bonus => ({
    id: 99, name: 'Test', nameJp: 'テスト', description: '', icon: '', effect: 'power',
    power: 5, level: 0, cost: 15, ...over,
});

describe('getMonsterById', () => {
    it('finds a monster by id', () => {
        expect(getMonsterById(1)?.name).toBe('Kappa');
    });

    it('returns undefined for an unknown id', () => {
        expect(getMonsterById(999)).toBeUndefined();
    });
});

describe('getNextMonsterId', () => {
    it('advances through the bestiary', () => {
        expect(getNextMonsterId(1)).toBe(2);
    });

    it('wraps around after the last monster', () => {
        expect(getNextMonsterId(MONSTERS[MONSTERS.length - 1].id)).toBe(MONSTERS[0].id);
    });
});

describe('calculateReward', () => {
    it('pays the base reward when the multiplier is unbought', () => {
        expect(calculateReward(10, BONUSES)).toBe(10);
    });

    it('applies the multiplier once it has levels', () => {
        const bonuses = [bonus({effect: 'goldMultiplier', level: 2, power: 3})];
        expect(calculateReward(10, bonuses)).toBe(60);
    });

    it('pays the base reward when no gold multiplier exists at all', () => {
        expect(calculateReward(10, [bonus({effect: 'power'})])).toBe(10);
    });

    // The reward used to be read as bonuses[2], so reordering the shop changed the payout.
    it('reads the multiplier by effect, not by position', () => {
        const forward = [bonus({id: 1, effect: 'power'}), bonus({id: 3, effect: 'goldMultiplier', level: 1, power: 2})];
        const reversed = [...forward].reverse();
        expect(calculateReward(10, reversed)).toBe(calculateReward(10, forward));
    });
});

describe('updateBonusesStats', () => {
    it('raises cost and power for a combat bonus', () => {
        const {newBonusCost, newBonusPower} = updateBonusesStats(bonus({effect: 'power', cost: 15, power: 5}));
        expect(newBonusCost).toBe(18);
        expect(newBonusPower).toBe(6);
    });

    it('raises only the cost of the gold multiplier', () => {
        const {newBonusCost, newBonusPower} = updateBonusesStats(bonus({effect: 'goldMultiplier', cost: 100, power: 2}));
        expect(newBonusCost).toBe(120);
        expect(newBonusPower).toBe(2);
    });
});

describe('findBonusByEffect', () => {
    it('returns the matching bonus', () => {
        expect(findBonusByEffect(BONUSES, 'dps')?.name).toBe('Chi Energy');
    });
});

describe('BONUSES data', () => {
    it('gives every bonus a unique id', () => {
        expect(new Set(BONUSES.map(b => b.id)).size).toBe(BONUSES.length);
    });

    // buyBonus resolves effects by lookup, so two bonuses sharing one effect would
    // make the second unreachable.
    it('gives every bonus a distinct effect', () => {
        expect(new Set(BONUSES.map(b => b.effect)).size).toBe(BONUSES.length);
    });
});
