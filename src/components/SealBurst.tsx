import type {Seal} from "../types/game.ts";
import {useReplayAnimation} from "../hooks/useReplayAnimation.ts";

interface SealBurstProps {
    seal: Seal | null;
}

/**
 * The catch, in one frame: the talisman snaps shut over where the yōkai stood.
 *
 * Drawn as an overlay rather than an exit animation on the creature itself, because
 * sealing swaps the creature for the next depth's in the same render — there is no
 * element left to animate out.
 */
export function SealBurst({seal}: SealBurstProps) {
    const ref = useReplayAnimation<HTMLDivElement>(
        seal?.id,
        seal?.isFirst || seal?.isAwakening ? 'seal-burst-first' : 'seal-burst',
    );

    if (!seal) return null;

    return (
        <div
            ref={ref}
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
            aria-hidden="true"
        >
            <span className="text-7xl">🪬</span>
            <span className="text-sm font-bold text-violet-800">
                {seal.nameJp} {seal.isFirst ? '— 新しい式神' : `Lv.${seal.level}`}
            </span>
        </div>
    );
}
