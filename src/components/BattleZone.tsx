import {Monster} from "./Monster.tsx";
import {AttackButton} from "./AttackButton.tsx";
import {DpsTimer} from "./DpsTimer.tsx";
import {CombatLog} from "./CombatLog.tsx";
import {useCombat} from "../hooks/useCombat.ts";
import {useReplayAnimation} from "../hooks/useReplayAnimation.ts";

export function BattleZone() {
    const {lastHit} = useCombat();

    // A kill or a critical earns the hard shake; an ordinary hit gets a nudge.
    const shakeRef = useReplayAnimation<HTMLDivElement>(
        lastHit?.id,
        lastHit?.isCrit || lastHit?.killed ? 'shake-hard' : 'shake',
    );

    return <div
        ref={shakeRef}
        className="bg-white rounded-lg shadow-xl p-4 sm:p-6 japanese-paper w-full lg:w-auto lg:min-w-[500px]"
    >
        <div className="text-center space-y-4">
            <Monster/>
            <AttackButton/>
            <DpsTimer/>
            <CombatLog/>
        </div>
    </div>;
}
