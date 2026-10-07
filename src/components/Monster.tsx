import {useMonster} from "../hooks/useMonster.ts";
import {useCombat} from "../hooks/useCombat.ts";
import {useCapture} from "../hooks/useCapture.ts";
import {useReplayAnimation} from "../hooks/useReplayAnimation.ts";
import {SEAL_THRESHOLD} from "../utils/capture.ts";
import {FloatingDamage} from "./FloatingDamage.tsx";
import {KillBurst} from "./KillBurst.tsx";
import {SealBurst} from "./SealBurst.tsx";

/**
 * Monster display and life bar
 * @constructor
 */
export function Monster() {
    const {currentMonster, monsterLife, depth} = useMonster();
    const {lastHit, lastSeal} = useCombat();
    const {sealThreshold} = useCapture();

    const lifePercentage = (monsterLife / currentMonster.maxLife) * 100;
    const isWeak = monsterLife > 0 && monsterLife <= sealThreshold;
    const emojiRef = useReplayAnimation<HTMLDivElement>(
        lastHit?.id,
        lastHit?.isCrit ? 'recoil-crit' : 'recoil',
    );

    return <div>
        <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold">深度 {depth}</span>
                {currentMonster.origin === 'generated' && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700" title="Summoned for this run">
                        ✨ summoned
                    </span>
                )}
            </div>
            <h2 className="text-3xl font-bold text-gray-800">{currentMonster.nameJp}</h2>
            <h3 className="text-xl text-gray-600">{currentMonster.name}</h3>
            <p className="text-gray-500">{currentMonster.description}</p>
        </div>

        {/* Anchor for the damage number, the kill burst and the seal, which are
            positioned against the creature rather than the card. */}
        <div className="relative">
            <div ref={emojiRef} className="text-8xl">
                {currentMonster.emoji}
            </div>
            <FloatingDamage hit={lastHit}/>
            <KillBurst hit={lastHit}/>
            <SealBurst seal={lastSeal}/>
        </div>

        {/* Life bar */}
        <div className="space-y-2">
            <div className="flex justify-between text-sm">
                <span>体力</span>
                <span>{monsterLife.toLocaleString('en-US')}/{currentMonster.maxLife.toLocaleString('en-US')}</span>
            </div>
            {/* Where the seal opens, marked on the bar itself, so the window is a place on
                screen rather than a number to work out. The mark is drawn over the fill
                rather than under it — behind, it is invisible exactly when it matters,
                which is the whole time the player is still grinding the yōkai down. */}
            <div className="relative w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                    className={`h-4 rounded-full transition-all duration-300 bg-gradient-to-r ${
                        isWeak ? 'from-violet-500 to-indigo-600' : 'from-red-500 to-red-600'
                    }`}
                    style={{width: `${lifePercentage}%`}}
                />
                <div
                    data-testid="seal-mark"
                    title="Seal opens here"
                    className="absolute inset-y-0 w-0.5 bg-violet-900 ring-1 ring-white/80"
                    style={{left: `${SEAL_THRESHOLD * 100}%`}}
                    aria-hidden="true"
                />
            </div>
        </div>
    </div>
}
