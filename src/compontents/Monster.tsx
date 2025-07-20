import {useGameContext} from "../hooks/UseGameContext.tsx";

/**
 * @constructor
 */
export function Monster() {
    const {currentMonster, isAttacking} = useGameContext();
    const lifePercentage = (currentMonster.life / currentMonster.maxLife) * 100;

    return <div>
        <div className="space-y-2">
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
                <span>{currentMonster.life}/{currentMonster.maxLife}</span>
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
