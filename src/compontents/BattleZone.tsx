import {Monster} from "./Monster.tsx";
import {AttackButton} from "./AttackButton.tsx";
import {DpsTimer} from "./DpsTimer.tsx";

export function BattleZone() {
    return <div className="space-y-6">
        <h1>Monster</h1>
        <Monster/>
        <AttackButton/>
        <DpsTimer/>
    </div>;
}