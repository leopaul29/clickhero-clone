import {Hand, Swords} from "lucide-react";
import {useCapture} from "../hooks/useCapture.ts";

/**
 * 手加減 — the stance switch.
 *
 * On, nothing the player does can land a killing blow, so every yōkai parks at 1 HP
 * and catching is certain. Off, full strength, and catching needs timing.
 *
 * It costs nothing to flip, and that is deliberate: kills are what pay, so a player
 * holding back earns almost nothing. The penalty is already in the economy and does
 * not need to be charged twice.
 */
export function TekagenToggle() {
    const {tekagen, toggleTekagen} = useCapture();

    return (
        <button
            onClick={toggleTekagen}
            aria-pressed={tekagen}
            title={tekagen ? 'Holding back — nothing you do can kill' : 'Full strength — kills pay gold'}
            className={`px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                tekagen ? 'bg-violet-600 hover:bg-violet-700' : 'bg-red-950/40 hover:bg-red-950/70'
            }`}
        >
            {tekagen ? <Hand className="w-5 h-5"/> : <Swords className="w-5 h-5"/>}
            <span className="text-sm font-bold">手加減 {tekagen ? 'ON' : 'OFF'}</span>
        </button>
    );
}
