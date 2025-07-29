import {useGameContext} from "./useGameContext.ts";
import {useMemo} from "react";

export const useCombat = () => {
    const context = useGameContext();
    if (!context) throw new Error('useCombat must be used within GameContextProvider');

    return useMemo(() => ({
        isAttacking: context.combatData.isAttacking,
        combatLog: context.combatData.combatLog,
        attackMonster: context.actions.attackMonster,
        applyDps: context.actions.applyDps
    }), [context.combatData, context.actions.attackMonster, context.actions.applyDps]);
};