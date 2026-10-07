import {useMonster} from "../hooks/useMonster.ts";
import {useCombat} from "../hooks/useCombat.ts";
import {useReplayAnimation} from "../hooks/useReplayAnimation.ts";
import {FloatingDamage} from "./FloatingDamage.tsx";
import {KillBurst} from "./KillBurst.tsx";

/**
 * Monster display and life bar
 * @constructor
 */
export function Monster() {
    const {currentMonster, monsterLife, depth} = useMonster();
    const {lastHit} = useCombat();

    const lifePercentage = (monsterLife / currentMonster.maxLife) * 100;
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

        {/* Anchor for the damage number and the kill burst, which are positioned
            against the creature rather than the card. */}
        <div className="relative">
            <div ref={emojiRef} className="text-8xl">
                {currentMonster.emoji}
            </div>
            <FloatingDamage hit={lastHit}/>
            <KillBurst hit={lastHit}/>
        </div>

        {/* Life bar */}
        <div className="space-y-2">
            <div className="flex justify-between text-sm">
                <span>体力</span>
                <span>{monsterLife.toLocaleString('en-US')}/{currentMonster.maxLife.toLocaleString('en-US')}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                    className="bg-gradient-to-r from-red-500 to-red-600 h-4 rounded-full transition-all duration-300"
                    style={{ width: `${lifePercentage}%` }}
                />
            </div>
        </div>
    </div>
}
