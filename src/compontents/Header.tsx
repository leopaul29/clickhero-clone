import {useGameContext} from "../hooks/UseGameContext.tsx";
import {BrushCleaning, Coins, Sword, Zap} from "lucide-react";
/**
 * Header component displaying player stats
 * @constructor
 */
export function Header() {
    const {gold, clearProgress, power, dps} = useGameContext();


    return <div className="bg-gradient-to-r from-red-900 to-red-800 text-white p-4 shadow-lg">
            <div className="container mx-auto flex justify-center items-center">
                <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                        <Coins className="w-6 h-6 text-yellow-300" />
                        <span className="text-2xl font-bold">{gold}</span>
                        <span className="text-sm">金</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Sword className="w-5 h-5 text-blue-300" />
                        <span className="text-lg">{power}</span>
                        <span className="text-sm">攻撃力</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Zap className="w-5 h-5 text-green-300" />
                        <span className="text-lg">{dps}</span>
                        <span className="text-sm">DPS</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button className="button" onClick={clearProgress}>
                            <BrushCleaning className="w-5 h-5 text-green-300" />
                            <span className="text-lg">Clear progress</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
}
