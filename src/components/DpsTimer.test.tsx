import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {useEffect} from 'react';
import App from '../App.tsx';
import {GameContextProvider} from '../contexts/GameContextProvider.tsx';
import {useCombat} from '../hooks/useCombat.ts';
import {clearSave, initialState, loadState, saveState} from '../utils/storage.ts';
import type {PersistentState} from '../types/game.ts';
import {HANDCRAFTED_DEPTH, monsterAt} from '../utils/bestiary.ts';

const DRAGON = monsterAt(HANDCRAFTED_DEPTH);

const seed = (over: Partial<PersistentState>) =>
    saveState({...initialState(), depth: DRAGON.depth, monsterLife: DRAGON.life, ...over});

const renderGame = () => render(<GameContextProvider><App/></GameContextProvider>);

/** The Monster component renders "<life>/<maxLife>". */
const readLife = (): number => {
    const text = screen.getByText(/^\d+\/\d+$/).textContent ?? '';
    return Number.parseInt(text.split('/')[0], 10);
};

const attackButton = () => screen.getByRole('button', {name: /攻撃/});

beforeEach(() => {
    localStorage.clear();
    clearSave();
    vi.useFakeTimers();
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe('DPS timer', () => {
    it('applies one tick per second while the player is idle', () => {
        seed({power: 1, dps: 10});
        renderGame();

        act(() => void vi.advanceTimersByTime(5_000));

        expect(DRAGON.life - readLife()).toBe(50);
    });

    /**
     * The regression this whole change exists for.
     *
     * `applyDps` used to be rebuilt on every state change, so DpsTimer's effect tore
     * down and recreated its 1000 ms interval several times per click. Measured in a
     * real browser before the fix: 28 intervals created and destroyed over 5 seconds
     * of clicking, and **zero** ticks applied. The auto-damage upgrade was dead for
     * anyone actually playing the game.
     *
     * 16 clicks at power 1 can account for at most 16 damage, so anything above that
     * can only have come from the DPS timer.
     */
    it('keeps ticking while the player clicks', () => {
        seed({power: 1, dps: 10});
        renderGame();

        const clicks = 16;
        for (let i = 0; i < clicks; i++) {
            fireEvent.click(attackButton());
            act(() => void vi.advanceTimersByTime(330));
        }

        const totalDamage = DRAGON.life - readLife();
        const maxClickDamage = clicks * 1;

        expect(totalDamage).toBeGreaterThan(maxClickDamage);
        expect(totalDamage - maxClickDamage).toBeGreaterThanOrEqual(50);
    });

    it('runs no timer at all while dps is zero', () => {
        seed({power: 1, dps: 0});
        renderGame();

        act(() => void vi.advanceTimersByTime(5_000));

        expect(readLife()).toBe(DRAGON.life);
    });
});

describe('action identity', () => {
    // The root cause of the bug above: an action whose identity changes restarts
    // every effect that depends on it.
    it('stays stable across state changes', () => {
        const seen: unknown[] = [];

        function Probe() {
            const {applyDps, attackMonster} = useCombat();
            useEffect(() => {
                seen.push(applyDps);
            }, [applyDps]);
            useEffect(() => {
                attackMonster();
            }, [attackMonster]);
            return null;
        }

        seed({power: 1, dps: 10});
        render(<GameContextProvider><App/><Probe/></GameContextProvider>);

        act(() => void vi.advanceTimersByTime(3_000));
        fireEvent.click(attackButton());
        act(() => void vi.advanceTimersByTime(1_000));

        expect(seen).toHaveLength(1);
    });
});

describe('persistence', () => {
    it('writes progress and restores it on the next visit', () => {
        seed({power: 3, dps: 0, gold: 4});
        renderGame();

        fireEvent.click(attackButton());
        act(() => void vi.advanceTimersByTime(1_000));

        expect(loadState().monsterLife).toBe(DRAGON.life - 3);

        cleanup();
        renderGame();

        expect(readLife()).toBe(DRAGON.life - 3);
    });
});

describe('reset from the menu', () => {
    const openReset = () => {
        fireEvent.click(screen.getByRole('button', {name: 'Open menu'}));
        fireEvent.click(screen.getByRole('button', {name: /reset game/i}));
    };

    it('resets to a real new game once confirmed', () => {
        seed({power: 500, dps: 300, gold: 9_999});
        renderGame();

        openReset();
        fireEvent.click(screen.getByRole('button', {name: 'Yes, reset'}));
        act(() => void vi.advanceTimersByTime(1_000));

        const fresh = initialState();
        expect(readLife()).toBe(fresh.monsterLife);
        expect(loadState()).toEqual(fresh);
    });

    it('keeps the save when the confirmation is cancelled', () => {
        seed({power: 500, gold: 9_999});
        renderGame();

        openReset();
        fireEvent.click(screen.getByRole('button', {name: 'Cancel'}));
        act(() => void vi.advanceTimersByTime(1_000));

        expect(loadState().gold).toBe(9_999);
    });
});
