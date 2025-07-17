import {useEffect} from "react";
import {useGameContext} from "../hooks/UseGameContext.tsx";

export function DpsTimer() {
    const { applyDps, dps } = useGameContext();

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