/**
 * Sound, synthesised rather than sampled.
 *
 * Every sound is a few oscillators and an envelope, so the game ships no audio
 * files and the bundle does not grow. Nothing here ever throws: a browser with no
 * Web Audio, a blocked autoplay policy or a test environment simply gets silence,
 * and the game plays on.
 *
 * The first sound can only start after a user gesture, which browsers require —
 * and in this game the first gesture is the attack click, so it unlocks itself.
 */

const MUTE_KEY = "clickhero-muted";

type WindowWithAudio = Window & { webkitAudioContext?: typeof AudioContext };

let context: AudioContext | null = null;
let muted = readMuted();

function readMuted(): boolean {
    try {
        return localStorage.getItem(MUTE_KEY) === "true";
    } catch {
        return false;
    }
}

export const isMuted = (): boolean => muted;

export function setMuted(next: boolean): void {
    muted = next;

    try {
        localStorage.setItem(MUTE_KEY, String(next));
    } catch {
        // A browser refusing storage should still mute for this session.
    }

    if (next && context) {
        void context.suspend().catch(() => {});
    }
}

/** The shared AudioContext, or null when sound is impossible or unwanted. */
function audio(): AudioContext | null {
    if (muted) return null;

    try {
        const Ctor = window.AudioContext ?? (window as WindowWithAudio).webkitAudioContext;
        if (!Ctor) return null;

        context ??= new Ctor();
        if (context.state === "suspended") void context.resume().catch(() => {});

        return context;
    } catch {
        return null;
    }
}

interface ToneOptions {
    frequency: number;
    /** Seconds. Kept short — a clicker plays these many times a second. */
    duration: number;
    type?: OscillatorType;
    gain?: number;
    /** Frequency at the end of the tone, for a pitch slide. */
    endFrequency?: number;
    delay?: number;
}

function tone(ctx: AudioContext, options: ToneOptions): void {
    const {frequency, duration, type = "sine", gain = 0.1, endFrequency, delay = 0} = options;

    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    if (endFrequency !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(endFrequency, 1), start + duration);
    }

    // A tiny attack instead of an instant one: a square wave starting at full gain
    // clicks, and that click is audible on every single hit.
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.005);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(amp).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
}

/** A dry wooden knock — the ordinary hit. */
export function playHit(): void {
    const ctx = audio();
    if (!ctx) return;

    tone(ctx, {frequency: 220, endFrequency: 110, duration: 0.07, type: "triangle", gain: 0.08});
}

/** Brighter and doubled, so a critical is audibly different, not just bigger. */
export function playCrit(): void {
    const ctx = audio();
    if (!ctx) return;

    tone(ctx, {frequency: 880, endFrequency: 440, duration: 0.12, type: "square", gain: 0.06});
    tone(ctx, {frequency: 1320, endFrequency: 660, duration: 0.18, type: "sine", gain: 0.05, delay: 0.04});
}

/** A low taiko thud for a kill. */
export function playKill(): void {
    const ctx = audio();
    if (!ctx) return;

    tone(ctx, {frequency: 150, endFrequency: 45, duration: 0.35, type: "sine", gain: 0.14});
    tone(ctx, {frequency: 300, endFrequency: 90, duration: 0.14, type: "triangle", gain: 0.05});
}

/** Rising pair for a purchase. */
export function playPurchase(): void {
    const ctx = audio();
    if (!ctx) return;

    tone(ctx, {frequency: 523, duration: 0.09, type: "sine", gain: 0.07});
    tone(ctx, {frequency: 784, duration: 0.14, type: "sine", gain: 0.06, delay: 0.07});
}

/** Test seam: drop the cached context and re-read the stored preference. */
export function resetAudioForTests(): void {
    context = null;
    muted = readMuted();
}
