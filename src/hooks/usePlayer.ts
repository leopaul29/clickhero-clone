import {useGameContext} from "./useGameContext.ts";
import {useMemo} from "react";

export const usePlayer = () => {
    const context = useGameContext();

    return useMemo(() => ({
        gold: context.persistentData.gold,
        power: context.persistentData.power,
        dps: context.persistentData.dps,
        bonuses: context.persistentData.bonuses,
        clearProgress: context.actions.clearProgress
    }), [context.persistentData, context.actions.clearProgress]);
};
