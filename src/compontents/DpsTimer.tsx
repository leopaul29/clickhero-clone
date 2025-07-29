import {useEffect} from "react";
import {useCombat} from "../hooks/useCombat.ts";
import {usePlayer} from "../hooks/usePlayer.ts";

/**
 * Component invisible to apply damage by seconds
 * @constructor
 */
export function DpsTimer() {
    const { applyDps } = useCombat();
    const {dps} = usePlayer()

    useEffect(() => {
        if (dps > 0) {
            const interval = setInterval(() => {
                applyDps();
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [dps, applyDps]);

    return null; // Invisible component
}