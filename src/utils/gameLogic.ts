import {MONSTERS} from "../data/monsters.ts";

export const getNextMonster=(currentMonsterId?: number)=> {
    const nextIndex = currentMonsterId ? currentMonsterId : 0;
    return MONSTERS[nextIndex];
}