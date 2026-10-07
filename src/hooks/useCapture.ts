import {useGameContext} from "./useGameContext.ts";
import {useMemo} from "react";

/** Everything the seal loop needs: the talismans, the stance, and the collection. */
export const useCapture = () => {
    const context = useGameContext();
    if (!context) throw new Error('useCapture must be used within GameContextProvider');

    return useMemo(() => ({
        ofuda: context.persistentData.ofuda,
        tekagen: context.persistentData.tekagen,
        shikigami: context.persistentData.shikigami,
        canSeal: context.captureData.canSeal,
        sealThreshold: context.captureData.sealThreshold,
        ofudaCost: context.captureData.ofudaCost,
        lastSeal: context.combatData.lastSeal,
        sealMonster: context.actions.sealMonster,
        toggleTekagen: context.actions.toggleTekagen,
        buyOfuda: context.actions.buyOfuda,
    }), [
        context.persistentData.ofuda,
        context.persistentData.tekagen,
        context.persistentData.shikigami,
        context.captureData,
        context.combatData.lastSeal,
        context.actions.sealMonster,
        context.actions.toggleTekagen,
        context.actions.buyOfuda,
    ]);
};
