import {MONSTERS} from "../data/monsters.ts";

export const getNextMonster=(currentId?: number)=> {
    const currentIndex = MONSTERS.findIndex(m => m.id === currentId);
    const nextIndex = (currentIndex + 1) % MONSTERS.length;
    return MONSTERS[nextIndex];
}