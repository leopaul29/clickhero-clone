import {MONSTERS} from "../data/monsters.ts";
import type {Bonus, BonusEffect, Monster} from "../types/game.ts";

export const getMonsterById = (currentId?: number): Monster | undefined => {
    return MONSTERS.find(m => m.id === currentId);
}

export const getNextMonsterId = (currentId?: number): number => {
    const currentIndex = MONSTERS.findIndex(m => m.id === currentId);
    const nextIndex = (currentIndex + 1) % MONSTERS.length;
    return MONSTERS[nextIndex].id
}

export const findBonusByEffect = (bonuses: Bonus[], effect: BonusEffect): Bonus | undefined => {
    return bonuses.find(b => b.effect === effect);
}

/**
 * Gold earned for a kill, after the gold-multiplier bonus.
 * Reads the multiplier by effect so reordering BONUSES cannot change the payout.
 */
export const calculateReward = (monsterGoldReward: number, bonuses: Bonus[]): number => {
    const multiplier = findBonusByEffect(bonuses, "goldMultiplier");

    if (!multiplier || multiplier.level === 0) return monsterGoldReward;

    return monsterGoldReward * (multiplier.level * multiplier.power);
}

/**
 * Cost and power of a bonus after it has been bought once more.
 * Every bonus gets more expensive; only the ones that raise a combat stat get
 * stronger, because the gold multiplier already scales through its level.
 */
export const updateBonusesStats = (bonus: Bonus) => {
    const newBonusCost: number = Math.floor(bonus.cost * 1.2 + (bonus.level * 0.01));
    const newBonusPower: number = bonus.effect === "goldMultiplier"
        ? bonus.power
        : Math.floor(bonus.power * 1.2);

    return {newBonusCost, newBonusPower}
}
