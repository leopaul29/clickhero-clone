import {useGameContext} from "./useGameContext.ts";
import {useMemo} from "react";

export const usePlayer = () => {
    const context = useGameContext();

    return useMemo(() => ({
        gold: context.persistentData.gold,
        power: context.persistentData.power,
        // Derived from the shikigami collection, which is the only thing that deals
        // automatic damage now.
        dps: context.captureData.dps,
        bonuses: context.persistentData.bonuses,
        clearProgress: context.actions.clearProgress
    }), [context.persistentData, context.captureData.dps, context.actions.clearProgress]);
};
