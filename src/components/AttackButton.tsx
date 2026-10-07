import {useCombat} from "../hooks/useCombat.ts";
import {useCapture} from "../hooks/useCapture.ts";
import {useMonster} from "../hooks/useMonster.ts";

/**
 * One button, three meanings.
 *
 * Below the seal threshold 攻撃する becomes 封じる — same finger, same place on screen,
 * different act. A second button beside it would make capture a mode to switch into;
 * the whole point is that the click's meaning changes underneath the player without
 * them having to do anything about it.
 *
 * Attacking is gated for 300 ms to stop spamming. Sealing is not: the window is
 * already as wide as the yōkai's remaining life divided by the player's damage, and
 * a cooldown on top of it would be a second, invisible timer.
 */
export function AttackButton() {
    const {attackMonster, isAttacking} = useCombat();
    const {canSeal, sealThreshold, ofuda, sealMonster} = useCapture();
    const {monsterLife} = useMonster();

    const isWeak = monsterLife > 0 && monsterLife <= sealThreshold;

    if (canSeal) {
        return (
            <div className="space-y-1">
                <button
                    onClick={sealMonster}
                    className="w-full py-4 px-6 rounded-lg text-white font-bold text-xl transition-all duration-200 bg-gradient-to-r from-violet-600 to-indigo-700 hover:from-violet-700 hover:to-indigo-800 shadow-lg hover:shadow-xl seal-ready"
                >
                    🪬 封じる
                </button>
                <p className="text-xs text-violet-700">Seal it — spends one 御札 ({ofuda} left)</p>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            <button
                onClick={attackMonster}
                disabled={isAttacking}
                className={`w-full py-4 px-6 rounded-lg text-white font-bold text-xl transition-all duration-300 ${
                    isAttacking
                        ? 'bg-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-xl'
                }`}
            >
                {isAttacking ? '攻撃中...' : '⚔️ 攻撃する'}
            </button>
            {isWeak && ofuda <= 0 && (
                <p className="text-xs text-amber-700">
                    御札がない — weak enough to seal, but you have no talismans
                </p>
            )}
        </div>
    );
}
