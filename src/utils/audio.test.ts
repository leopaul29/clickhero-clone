import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {isMuted, playCrit, playHit, playKill, playPurchase, resetAudioForTests, setMuted} from './audio.ts';

const MUTE_KEY = 'clickhero-muted';
const everySound = [playHit, playCrit, playKill, playPurchase];

beforeEach(() => {
    localStorage.clear();
    resetAudioForTests();
});

afterEach(() => vi.unstubAllGlobals());

describe('mute preference', () => {
    it('starts unmuted', () => {
        expect(isMuted()).toBe(false);
    });

    it('round-trips through storage', () => {
        setMuted(true);
        expect(isMuted()).toBe(true);
        expect(localStorage.getItem(MUTE_KEY)).toBe('true');

        resetAudioForTests();
        expect(isMuted()).toBe(true);
    });

    it('unmutes again', () => {
        setMuted(true);
        setMuted(false);
        resetAudioForTests();
        expect(isMuted()).toBe(false);
    });

    it('still mutes for the session when storage refuses the write', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError');
        });

        expect(() => setMuted(true)).not.toThrow();
        expect(isMuted()).toBe(true);
    });

    it('treats unreadable storage as unmuted rather than failing', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });

        resetAudioForTests();
        expect(isMuted()).toBe(false);
    });
});

/*
 * Sound is a garnish: a browser without Web Audio, a blocked autoplay policy or a
 * test environment must get silence, never an exception that stops the game.
 */
describe('playing sounds', () => {
    it('is silent and safe where Web Audio does not exist', () => {
        expect(window.AudioContext).toBeUndefined();

        for (const play of everySound) {
            expect(play).not.toThrow();
        }
    });

    it('does not construct a context while muted', () => {
        const Ctor = vi.fn();
        vi.stubGlobal('AudioContext', Ctor);

        setMuted(true);
        for (const play of everySound) play();

        expect(Ctor).not.toHaveBeenCalled();
    });

    it('swallows a constructor that throws', () => {
        vi.stubGlobal('AudioContext', class {
            constructor() {
                throw new Error('not allowed');
            }
        });

        for (const play of everySound) {
            expect(play).not.toThrow();
        }
    });

    it('plays through a working context, and reuses it across sounds', () => {
        const started: number[] = [];
        let built = 0;

        const node = () => ({
            connect: vi.fn().mockReturnThis(),
            frequency: {setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn()},
            gain: {setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn()},
            start: vi.fn((at: number) => started.push(at)),
            stop: vi.fn(),
            type: 'sine' as OscillatorType,
        });

        // A real constructor, not vi.fn(arrow): an arrow implementation cannot be
        // called with `new`, so the module would only ever see it throw.
        vi.stubGlobal('AudioContext', class {
            currentTime = 0;
            state = 'running';
            destination = {};
            constructor() {
                built++;
            }
            createOscillator = node;
            createGain = node;
            resume = vi.fn();
            suspend = vi.fn(() => Promise.resolve());
        });

        playHit();
        playKill();

        expect(built).toBe(1);
        expect(started.length).toBeGreaterThan(0);
    });

    it('suspends the running context when muted mid-session', () => {
        const suspend = vi.fn(() => Promise.resolve());

        vi.stubGlobal('AudioContext', class {
            currentTime = 0;
            state = 'running';
            destination = {};
            createOscillator = () => ({
                connect: vi.fn().mockReturnThis(),
                frequency: {setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn()},
                start: vi.fn(),
                stop: vi.fn(),
                type: 'sine' as OscillatorType,
            });
            createGain = () => ({
                connect: vi.fn().mockReturnThis(),
                gain: {setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn()},
            });
            resume = vi.fn();
            suspend = suspend;
        });

        playHit();
        setMuted(true);

        expect(suspend).toHaveBeenCalled();
    });
});
