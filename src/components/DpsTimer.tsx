import {useEffect, useRef} from "react";
import {useCombat} from "../hooks/useCombat.ts";
import {usePlayer} from "../hooks/usePlayer.ts";

/** One tick of automatic damage per second. */
const DPS_INTERVAL_MS = 1000;

/**
 * Invisible component that applies damage per second.
 *
 * The callback is held in a ref so the interval depends on `dps` alone. Without
 * that, any change of `applyDps`'s identity restarts the timer, and a player
 * clicking faster than once a second never receives a single tick.
 * @constructor
 */
export function DpsTimer() {
    const {applyDps} = useCombat();
    const {dps} = usePlayer();

    const applyDpsRef = useRef(applyDps);
    useEffect(() => {
        applyDpsRef.current = applyDps;
    }, [applyDps]);

    useEffect(() => {
        if (dps <= 0) return;

        const interval = setInterval(() => applyDpsRef.current(), DPS_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [dps]);

    return null; // Invisible component
}
