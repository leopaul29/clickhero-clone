import type {Hit} from "../types/game.ts";

/** Enough to read as a burst, few enough to stay cheap on a phone. */
const PARTICLE_COUNT = 12;

const PARTICLES = Array.from({length: PARTICLE_COUNT}, (_, index) => ({
    angle: (360 / PARTICLE_COUNT) * index,
    // Alternating reach, so the burst is not a perfect wheel.
    distance: index % 2 === 0 ? 70 : 46,
}));

interface KillBurstProps {
    hit: Hit | null;
}

/**
 * Particle burst on a kill. Remounted per hit id, like FloatingDamage.
 * @constructor
 */
export function KillBurst({hit}: KillBurstProps) {
    if (!hit?.killed) return null;

    return (
        <div key={hit.id} data-testid="kill-burst" aria-hidden="true" className="pointer-events-none absolute inset-0">
            {PARTICLES.map(({angle, distance}, index) => (
                <span
                    key={index}
                    className={`burst-particle absolute left-1/2 top-1/2 block h-2 w-2 rounded-full ${
                        hit.isCrit ? 'bg-amber-400' : 'bg-red-400'
                    }`}
                    style={{
                        ['--angle' as string]: `${angle}deg`,
                        ['--distance' as string]: `${distance}px`,
                    }}
                />
            ))}
        </div>
    );
}
