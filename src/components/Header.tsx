import {BrushCleaning, Coins, Sword, Zap} from "lucide-react";
import {usePlayer} from "../hooks/usePlayer.ts";
import {SoundToggle} from "./SoundToggle.tsx";

/** Large numbers stay readable once the gold multiplier starts compounding. */
const formatNumber = (value: number): string => value.toLocaleString('en-US');

/**
 * Header component displaying player stats
 * @constructor
 */
export function Header() {
    const {gold, power, dps, clearProgress} = usePlayer();

    const onClearProgress = () => {
        if (window.confirm('Reset all progress? This cannot be undone.')) {
            clearProgress();
        }
    };

    return <div className="bg-gradient-to-r from-red-900 to-red-800 text-white p-4 shadow-lg">
            <div className="container mx-auto flex justify-center items-center">
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
                    <div className="flex items-center space-x-2">
                        <Coins className="w-6 h-6 text-yellow-300" />
                        <span className="text-2xl font-bold">{formatNumber(gold)}</span>
                        <span className="text-sm">金</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Sword className="w-5 h-5 text-blue-300" />
                        <span className="text-lg">{formatNumber(power)}</span>
                        <span className="text-sm">攻撃力</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Zap className="w-5 h-5 text-green-300" />
                        <span className="text-lg">{formatNumber(dps)}</span>
                        <span className="text-sm">DPS</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <SoundToggle/>
                        <button
                            onClick={onClearProgress}
                            className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                        >
                            <BrushCleaning className="w-5 h-5" />
                            <span>Clear progress</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
}
