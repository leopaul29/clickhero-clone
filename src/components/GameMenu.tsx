import {useEffect, useState} from "react";
import {Menu, RotateCcw, X} from "lucide-react";
import {usePlayer} from "../hooks/usePlayer.ts";

/**
 * Header menu. Holds the reset, which sits behind a confirmation step because it
 * wipes the save for good.
 * @constructor
 */
export function GameMenu() {
    const {clearProgress} = usePlayer();
    const [open, setOpen] = useState(false);
    const [confirming, setConfirming] = useState(false);

    const close = () => {
        setOpen(false);
        setConfirming(false);
    };

    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') close();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    const reset = () => {
        clearProgress();
        close();
    };

    return <>
        <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            title="Menu"
            className="bg-red-950/40 hover:bg-red-950/70 p-2 rounded-lg transition-colors"
        >
            <Menu className="w-5 h-5"/>
        </button>

        {open && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={close}>
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="game-menu-title"
                    onClick={event => event.stopPropagation()}
                    className="bg-amber-50 text-gray-900 rounded-xl shadow-2xl w-full max-w-sm p-5"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 id="game-menu-title" className="text-xl font-bold text-red-900">Menu</h2>
                        <button onClick={close} aria-label="Close menu" className="p-1 rounded hover:bg-amber-200">
                            <X className="w-5 h-5"/>
                        </button>
                    </div>

                    {confirming ? (
                        <div className="space-y-4">
                            <p>Reset all progress? Gold, upgrades and depth will be lost. This cannot be undone.</p>
                            <div className="flex gap-2 justify-end">
                                <button
                                    onClick={() => setConfirming(false)}
                                    className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={reset}
                                    className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white transition-colors"
                                >
                                    Yes, reset
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setConfirming(true)}
                            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                            <RotateCcw className="w-5 h-5"/>
                            <span>Reset game</span>
                        </button>
                    )}
                </div>
            </div>
        )}
    </>;
}
