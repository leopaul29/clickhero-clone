import type {Shikigami} from "../types/game.ts";
import {useCapture} from "../hooks/useCapture.ts";
import {usePlayer} from "../hooks/usePlayer.ts";
import {awakenings, copiesForNextLevel, shikigamiDps} from "../utils/shikigami.ts";

/** 覚醒 is shown rather than counted: a creature visibly changing beats a number. */
const awakeningMark = (level: number): string => '✦'.repeat(awakenings(level));

function Entry({entry}: { entry: Shikigami }) {
    const needed = copiesForNextLevel(entry.level);

    return (
        <li className="flex items-center justify-between gap-3 rounded-lg border border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 p-3">
            <div className="flex items-center space-x-3 min-w-0">
                <span className="text-2xl shrink-0">{entry.emoji}</span>
                <div className="min-w-0">
                    <h3 className="font-bold text-gray-800 truncate">
                        {entry.nameJp} <span className="text-violet-600">{awakeningMark(entry.level)}</span>
                    </h3>
                    <p className="text-sm text-gray-600 truncate">{entry.name}</p>
                    <p className="text-xs text-gray-500">
                        Lv.{entry.level} · sealed at 深度 {entry.depth} · {entry.copies}/{needed} toward Lv.{entry.level + 1}
                    </p>
                </div>
            </div>
            <div className="text-right shrink-0">
                <div className="text-lg font-bold text-indigo-700">{shikigamiDps(entry).toLocaleString('en-US')}</div>
                <div className="text-xs text-gray-500">DPS</div>
            </div>
        </li>
    );
}

/**
 * The collection, which is also the engine.
 *
 * There is no "N / 100" here on purpose. The hundred is the design's spine, but the
 * bestiary does not hold a hundred named yōkai yet, and a progress bar against a
 * number the game cannot actually reach would be a lie told every session.
 */
export function ShikigamiCodex() {
    const {shikigami} = useCapture();
    const {dps} = usePlayer();

    const entries = Object.values(shikigami).sort((a, b) => b.depth - a.depth || a.name.localeCompare(b.name));

    return (
        <div
            data-testid="codex"
            className="bg-white rounded-lg shadow-xl p-4 sm:p-6 japanese-paper w-full lg:w-auto lg:min-w-[500px]"
        >
            <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 className="text-2xl font-bold text-gray-800">🪬 式神 (Shikigami)</h2>
                <span className="text-sm text-gray-600">
                    {entries.length} sealed · {dps.toLocaleString('en-US')} DPS
                </span>
            </div>

            {entries.length === 0 ? (
                <p className="text-sm text-gray-500">
                    Nothing bound yet. Weaken a yōkai into the violet band on its life bar, then
                    spend an 御札 to seal it — a sealed spirit fights for you, and it is the only
                    thing that does.
                </p>
            ) : (
                <ul className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {entries.map(entry => <Entry key={entry.key} entry={entry}/>)}
                </ul>
            )}
        </div>
    );
}
