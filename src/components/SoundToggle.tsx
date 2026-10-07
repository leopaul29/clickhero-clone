import {useState} from "react";
import {Volume2, VolumeX} from "lucide-react";
import {isMuted, setMuted} from "../utils/audio.ts";

/**
 * Mute switch. The preference lives in the audio module, which persists it, so
 * this holds only the copy React needs to re-render on.
 * @constructor
 */
export function SoundToggle() {
    const [muted, setMutedState] = useState(isMuted);

    const toggle = () => {
        const next = !muted;
        setMuted(next);
        setMutedState(next);
    };

    return (
        <button
            onClick={toggle}
            aria-pressed={muted}
            aria-label={muted ? 'Unmute sound' : 'Mute sound'}
            title={muted ? 'Unmute sound' : 'Mute sound'}
            className="bg-red-950/40 hover:bg-red-950/70 p-2 rounded-lg transition-colors"
        >
            {muted ? <VolumeX className="w-5 h-5"/> : <Volume2 className="w-5 h-5"/>}
        </button>
    );
}
