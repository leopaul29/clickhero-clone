import {useGameContext} from "./useGameContext.ts";
import {useMemo} from "react";

export const useMonster = () => {
    const context = useGameContext();
    if (!context) throw new Error('useMonster must be used within GameContextProvider');

    return useMemo(() => ({
        currentMonster: context.monsterData.currentMonster,
        monsterLife: context.monsterData.monsterLife,
        isAttacking: context.combatData.isAttacking
    }), [
        context.monsterData.currentMonster,
        context.monsterData.monsterLife,
        context.combatData.isAttacking]);
};