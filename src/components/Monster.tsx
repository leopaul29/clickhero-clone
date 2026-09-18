import {useMonster} from "../hooks/useMonster.ts";

/**
 * Monster display and life bar
 * @constructor
 */
export function Monster() {
    const {currentMonster, monsterLife, depth, isAttacking} = useMonster();
    const lifePercentage = (monsterLife / currentMonster.maxLife) * 100;

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

        <div className={`text-8xl ${isAttacking ? 'attack-animation' : ''}`}>
            {currentMonster.emoji}
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
