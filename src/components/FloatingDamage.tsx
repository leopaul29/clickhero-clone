import type {Hit} from "../types/game.ts";

interface FloatingDamageProps {
    hit: Hit | null;
}

/**
 * The number that flies off the monster when it is struck.
 *
 * Keyed on the hit id so React remounts it for every blow — that is what replays
 * the animation when two identical hits land in a row.
 * @constructor
 */
export function FloatingDamage({hit}: FloatingDamageProps) {
    if (!hit) return null;

    return (
        <div
            key={hit.id}
            data-testid="floating-damage"
            aria-hidden="true"
            className={`pointer-events-none absolute left-1/2 top-2 select-none font-extrabold drop-shadow ${
                hit.isCrit
                    ? 'float-damage-crit text-4xl text-amber-500'
                    : 'float-damage text-2xl text-red-600'
            }`}
        >
            {hit.isCrit && <span className="mr-1 text-xl align-middle">会心</span>}
            -{hit.amount.toLocaleString('en-US')}
        </div>
    );
}
