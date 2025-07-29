import {useCombat} from "../hooks/useCombat.ts";

/**
 * Attack button
 * Is disable during 300ms after clicking to prevent spamming
 * @constructor
 */
export function AttackButton() {
    const {attackMonster, isAttacking} = useCombat();

    return (
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
    )
}