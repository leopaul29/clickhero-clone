import {BONUSES} from "../data/monsters.ts";
import {useGameContext} from "../hooks/UseGameContext.tsx";

export function Shop() {
    const {buyBonus, gold} = useGameContext();

    return <div className="bg-white rounded-lg shadow-xl p-6 japanese-paper">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            🏪 道具屋 (Shop)
        </h2>

        <div className="space-y-4">
            {BONUSES.map(bonus => (
                <div key={bonus.name} className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200">
                    <div className="flex items-center justify-between gap-5">
                        <div className="flex items-center space-x-3">
                            <span className="text-2xl">{bonus.icon}</span>
                            <div>
                                <h3 className="font-bold text-gray-800">{bonus.nameJp}</h3>
                                <p className="text-sm text-gray-600">{bonus.name}</p>
                                <p className="text-xs text-gray-500">{bonus.description}</p>
                                <p className="text-xs text-blue-600">Level {bonus.level}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-lg font-bold text-yellow-700">{bonus.cost} 金</div>
                            <button
                                onClick={() => buyBonus(bonus)}
                                disabled={gold < bonus.cost}
                                className={`mt-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                                    gold >= bonus.cost
                                        ? 'bg-red-600 hover:bg-red-700 text-white'
                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                            >
                                {gold >= bonus.cost ? '購入' : '資金不足'}
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>;
}