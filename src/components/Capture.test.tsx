import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, cleanup, fireEvent, render, screen, within} from '@testing-library/react';
import App from '../App.tsx';
import {GameContextProvider} from '../contexts/GameContextProvider.tsx';
import {initialState, loadState, saveState} from '../utils/storage.ts';
import {resetAudioForTests} from '../utils/audio.ts';
import {monsterAt} from '../utils/bestiary.ts';
import {ofudaCost, SEAL_THRESHOLD, sealThresholdFor} from '../utils/capture.ts';
import {CRIT_CHANCE} from '../state/gameReducer.ts';
import type {PersistentState} from '../types/game.ts';

const KAPPA = monsterAt(1);
const WEAK = sealThresholdFor(KAPPA.maxLife);

const seed = (over: Partial<PersistentState> = {}) =>
    saveState({...initialState(), depth: 1, monsterLife: KAPPA.life, ...over});

const renderGame = () => render(<GameContextProvider><App/></GameContextProvider>);

const sealButton = () => screen.getByRole('button', {name: /封じる/});
const attackButton = () => screen.getByRole('button', {name: /攻撃/});
const codex = () => screen.getByTestId('codex');
const buyOfudaButton = () => screen.getByTestId('buy-ofuda');

/** Past the 300 ms attack cooldown and the 400 ms save debounce, so the save is current. */
const settle = () => act(() => void vi.advanceTimersByTime(500));

/** The Monster component renders "<life>/<maxLife>". */
const readLife = (): number =>
    Number.parseInt((screen.getByText(/^\d+\/\d+$/).textContent ?? '').split('/')[0], 10);

beforeEach(() => {
    localStorage.clear();
    resetAudioForTests();
    vi.useFakeTimers();
    // No crits: a 10× blow would go straight through the seal window.
    vi.spyOn(Math, 'random').mockReturnValue(CRIT_CHANCE + 0.1);
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('the seal window on the life bar', () => {
    it('marks where the seal opens, at the threshold fraction', () => {
        seed();
        renderGame();

        expect(screen.getByTestId('seal-mark').style.left).toBe(`${SEAL_THRESHOLD * 100}%`);
    });

    // Drawn under the fill it is invisible for the whole time the player is grinding
    // the yōkai down — which is exactly when they need to see where they are aiming.
    it('draws the mark after the fill, so it is not painted over', () => {
        seed();
        renderGame();

        const mark = screen.getByTestId('seal-mark');
        const fill = mark.previousElementSibling;

        expect(fill).not.toBeNull();
        expect(mark.compareDocumentPosition(fill!) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    });
});

describe('the button morphs', () => {
    it('offers an attack while the yōkai is strong', () => {
        seed({ofuda: 3});
        renderGame();

        expect(attackButton()).toBeTruthy();
        expect(screen.queryByRole('button', {name: /封じる/})).toBeNull();
    });

    it('becomes a seal once the yōkai is inside the window', () => {
        seed({ofuda: 3, monsterLife: WEAK});
        renderGame();

        expect(sealButton()).toBeTruthy();
        expect(screen.queryByRole('button', {name: /攻撃/})).toBeNull();
    });

    // A seal the player cannot pay for must not be offered — and the reason has to be
    // on screen, or a player with restraint on and no talismans looks at a game that
    // has simply stopped responding.
    it('stays an attack with no 御札, and says why', () => {
        seed({ofuda: 0, monsterLife: WEAK});
        renderGame();

        expect(screen.queryByRole('button', {name: /封じる/})).toBeNull();
        expect(screen.getByText(/御札がない/)).toBeTruthy();
    });

    it('does not offer the seal to a full-health yōkai even with talismans in hand', () => {
        seed({ofuda: 99, monsterLife: KAPPA.maxLife});
        renderGame();

        expect(screen.queryByRole('button', {name: /封じる/})).toBeNull();
    });
});

describe('sealing', () => {
    it('binds the yōkai, spends a talisman and descends', () => {
        seed({ofuda: 3, monsterLife: WEAK});
        renderGame();

        fireEvent.click(sealButton());
        settle();

        expect(screen.getByText('深度 2')).toBeTruthy();
        expect(within(codex()).getByText(/河童/)).toBeTruthy();
        expect(loadState().ofuda).toBe(2);
    });

    it('writes the catch to the save, so a reload keeps it', () => {
        seed({ofuda: 1, monsterLife: WEAK});
        renderGame();

        fireEvent.click(sealButton());
        settle();
        cleanup();
        renderGame();

        expect(within(codex()).getByText(/河童/)).toBeTruthy();
    });

    it('shows nothing in the codex before the first catch', () => {
        seed({ofuda: 3});
        renderGame();

        expect(within(codex()).getByText(/Nothing bound yet/)).toBeTruthy();
    });

    /**
     * The inversion: the collection is the engine. A player who has caught nothing has
     * no automatic damage at all, and the first seal is what starts the clock.
     */
    it('is the only thing that produces automatic damage', () => {
        seed({ofuda: 1, monsterLife: WEAK, power: 1});
        renderGame();

        act(() => void vi.advanceTimersByTime(4_000));
        expect(readLife()).toBe(WEAK);

        fireEvent.click(sealButton());
        const afterSeal = readLife();

        act(() => void vi.advanceTimersByTime(4_000));
        expect(readLife()).toBeLessThan(afterSeal);
    });
});

describe('手加減', () => {
    const stance = () => screen.getByRole('button', {name: /手加減/});

    it('is off to begin with', () => {
        seed();
        renderGame();

        expect(stance().getAttribute('aria-pressed')).toBe('false');
    });

    // The reliability claim, driven through the real UI: a power-50 click that would
    // flatten a 15 HP Kappa several times over leaves it alive and catchable instead.
    it('holds a yōkai at one point of life however hard the player hits', () => {
        // No talismans, so the button never morphs out from under the hammering and
        // every one of these clicks is a real attack that the cap has to absorb.
        seed({power: 50, ofuda: 0});
        renderGame();

        fireEvent.click(stance());
        expect(stance().getAttribute('aria-pressed')).toBe('true');

        for (let i = 0; i < 5; i++) {
            fireEvent.click(attackButton());
            act(() => void vi.advanceTimersByTime(330));
        }

        expect(readLife()).toBe(1);
        expect(screen.getByText('深度 1')).toBeTruthy();
    });

    it('leaves the yōkai sealable rather than dead', () => {
        seed({power: 50, ofuda: 1});
        renderGame();

        fireEvent.click(stance());
        fireEvent.click(attackButton());

        expect(readLife()).toBe(1);
        expect(sealButton()).toBeTruthy();
    });

    it('released, the same hits kill and pay', () => {
        seed({power: 50, gold: 0});
        renderGame();

        fireEvent.click(attackButton());
        settle();

        expect(screen.getByText('深度 2')).toBeTruthy();
        expect(loadState().gold).toBeGreaterThan(0);
    });

    it('survives a reload', () => {
        seed();
        renderGame();

        fireEvent.click(stance());
        settle();
        cleanup();
        renderGame();

        expect(stance().getAttribute('aria-pressed')).toBe('true');
    });
});

describe('buying 御札', () => {
    it('spends gold and adds a talisman', () => {
        seed({gold: ofudaCost(1), ofuda: 0});
        renderGame();

        fireEvent.click(buyOfudaButton());
        settle();

        expect(loadState().ofuda).toBe(1);
        expect(loadState().gold).toBe(0);
    });

    it('is refused when the purse is short', () => {
        seed({gold: ofudaCost(1) - 1, ofuda: 0});
        renderGame();

        expect(buyOfudaButton().hasAttribute('disabled')).toBe(true);
    });
});
