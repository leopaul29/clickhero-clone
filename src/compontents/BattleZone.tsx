import {Monster} from "./Monster.tsx";
import {AttackButton} from "./AttackButton.tsx";
import {DpsTimer} from "./DpsTimer.tsx";

export function BattleZone() {
    return <div className="bg-white rounded-lg shadow-xl p-6 japanese-paper">
        <div className="text-center space-y-4">
            <Monster/>
            <AttackButton/>
            <DpsTimer/>
        </div>
    </div>;
}