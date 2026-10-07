import type {Bonus} from "../types/game.ts";
import {useShop} from "../hooks/useShop.ts";
import {useCapture} from "../hooks/useCapture.ts";

/**
 * Display bonuses player can buy with gold by clicking on buy button
 * buy button is disabled when not enough gold
 * @constructor
 */
export function Shop() {
    const {gold, bonuses, buyBonus} = useShop();
    const {ofuda, ofudaCost, buyOfuda} = useCapture();

    return <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 japanese-paper w-full lg:w-auto lg:min-w-[500px]">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            🏪 道具屋 (Shop)
        </h2>

        <div className="space-y-4">
            {/* A consumable, so it sits apart from the levelled bonuses: an 御札 is spent,
                not owned. Its price is five kills at the current depth, always — which is
                the one number the restraint economy balances on. */}
            <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-lg p-4 border border-violet-200">
                <div className="flex items-center justify-between gap-5">
                    <div className="flex items-center space-x-3">
                        <span className="text-2xl">🪬</span>
                        <div>
                            <h3 className="font-bold text-gray-800">御札</h3>
                            <p className="text-sm text-gray-600">Ofuda</p>
                            <p className="text-xs text-gray-500">Seals one weakened yōkai into a shikigami</p>
                            <p className="text-xs text-violet-700">Held {ofuda}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-bold text-yellow-700">{ofudaCost.toLocaleString('en-US')} 金</div>
                        <button
                            data-testid="buy-ofuda"
                            onClick={buyOfuda}
                            disabled={gold < ofudaCost}
                            className={`mt-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                                gold >= ofudaCost
                                    ? 'bg-violet-600 hover:bg-violet-700 text-white'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            {gold >= ofudaCost ? '購入' : '資金不足'}
                        </button>
                    </div>
                </div>
            </div>

            {bonuses.map((bonus:Bonus) => (
                <div key={bonus.id} className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200">
                    <div className="flex items-center justify-between gap-5">
                        <div className="flex items-center space-x-3">
                            <span className="text-2xl">{bonus.icon}</span>
                            <div>
                                <h3 className="font-bold text-gray-800">{bonus.nameJp}</h3>
                                <p className="text-sm text-gray-600">{bonus.name}</p>
                                <p className="text-xs text-gray-500">{bonus.description} {bonus.power}</p>
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