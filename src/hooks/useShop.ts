import {useGameContext} from "./useGameContext.ts";
import {useMemo} from "react";

export const useShop = () => {
    const context = useGameContext();
    if (!context) throw new Error('useShop must be used within GameContextProvider');

    return useMemo(() => ({
        gold: context.persistentData.gold,
        bonuses: context.persistentData.bonuses,
        buyBonus: context.actions.buyBonus
    }), [context.persistentData.gold, context.persistentData.bonuses, context.actions.buyBonus]);
};