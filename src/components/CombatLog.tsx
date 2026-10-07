import {useCombat} from "../hooks/useCombat.ts";

/**
 * Logs interactions (combat and actions)
 * attacks, dps, buy bonuses
 * @constructor
 */
export function CombatLog() {
    const {combatLog} = useCombat();
    return <div className="bg-black bg-opacity-80 rounded-lg p-4 text-green-400 font-mono text-sm">
        <div className="mb-2 text-white">戦闘ログ:</div>
        {combatLog.map((log:string, index:number) => (
            <div key={index} className="opacity-80">{log}</div>
        ))}
    </div>
}