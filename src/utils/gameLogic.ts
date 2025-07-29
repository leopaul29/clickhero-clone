import {BONUSES, MONSTERS} from "../data/monsters.ts";
import type {Bonus, Monster} from "../types/game.ts";

export const getMonsterById=(currentId?: number):Monster|undefined=> {
    return MONSTERS.find(m => m.id === currentId);
}
export const getNextMonsterId=(currentId?:number):number => {
    const currentIndex = MONSTERS.findIndex(m => m.id === currentId);
    const nextIndex = (currentIndex + 1) % MONSTERS.length;
    return MONSTERS[nextIndex].id
}
export const calculateReward = (monsterGoldReward:number , multiplierLevel:number, multiplierPower:number) => {
    return multiplierLevel === 0 ?
        monsterGoldReward
        : monsterGoldReward * (multiplierLevel * multiplierPower);
}

const COST_TO_INCREASE_BONUSES_ID: number[] = BONUSES.map(b => b.id);
const POWER_TO_INCREASE_BONUSES_ID: number[] = BONUSES.filter(b => b.id !== 3).map(b => b.id);

export const updateBonusesStats = (bonus:Bonus) => {
    let newBonusCost:number = bonus.cost;
    let newBonusPower:number = bonus.power;

    if(COST_TO_INCREASE_BONUSES_ID.includes(bonus.id)){
        newBonusCost = Math.floor(bonus.cost * 1.5)
    }

    if(POWER_TO_INCREASE_BONUSES_ID.includes(bonus.id)) {
        newBonusPower = Math.floor(bonus.power * 1.5)
    }

    return {newBonusCost, newBonusPower}
}