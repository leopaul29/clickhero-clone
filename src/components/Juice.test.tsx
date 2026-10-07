import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import App from '../App.tsx';
import {GameContextProvider} from '../contexts/GameContextProvider.tsx';
import {clearSave, initialState, saveState} from '../utils/storage.ts';
import {resetAudioForTests} from '../utils/audio.ts';
import {CRIT_CHANCE, CRIT_MULTIPLIER} from '../state/gameReducer.ts';
import {monsterAt} from '../utils/bestiary.ts';
import type {PersistentState} from '../types/game.ts';

const seed = (over: Partial<PersistentState> = {}) =>
    saveState({...initialState(), depth: 5, monsterLife: monsterAt(5).life, ...over});

const renderGame = () => render(<GameContextProvider><App/></GameContextProvider>);
const attackButton = () => screen.getByRole('button', {name: /攻撃/});

/** Force every roll to land on, or off, a critical. */
const rollsCrit = (yes: boolean) =>
    vi.spyOn(Math, 'random').mockReturnValue(yes ? CRIT_CHANCE / 2 : CRIT_CHANCE + 0.1);

beforeEach(() => {
    localStorage.clear();
    clearSave();
    resetAudioForTests();
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('damage numbers', () => {
    it('shows nothing before the first blow', () => {
        seed();
        renderGame();
        expect(screen.queryByTestId('floating-damage')).toBeNull();
    });

    it('flies the damage off the monster when it is struck', () => {
        rollsCrit(false);
        seed({power: 7});
        renderGame();

        fireEvent.click(attackButton());

        expect(screen.getByTestId('floating-damage').textContent).toBe('-7');
    });

    it('marks a critical and multiplies what it shows', () => {
        rollsCrit(true);
        seed({power: 7});
        renderGame();

        fireEvent.click(attackButton());

        const number = screen.getByTestId('floating-damage');
        expect(number.textContent).toContain(String(7 * CRIT_MULTIPLIER));
        expect(number.textContent).toContain('会心');
        expect(number.className).toContain('float-damage-crit');
    });

    it('does not dress an ordinary hit as a critical', () => {
        rollsCrit(false);
        seed({power: 7});
        renderGame();

        fireEvent.click(attackButton());

        const number = screen.getByTestId('floating-damage');
        expect(number.textContent).not.toContain('会心');
        expect(number.className).toContain('float-damage');
        expect(number.className).not.toContain('float-damage-crit');
    });
});

describe('kill burst', () => {
    it('stays hidden while the monster lives', () => {
        rollsCrit(false);
        seed({power: 1});
        renderGame();

        fireEvent.click(attackButton());

        expect(screen.queryByTestId('kill-burst')).toBeNull();
    });

    it('bursts on the killing blow', () => {
        rollsCrit(false);
        seed({power: 1_000_000});
        renderGame();

        fireEvent.click(attackButton());

        expect(screen.getByTestId('kill-burst').childElementCount).toBeGreaterThan(0);
    });
});

describe('recoil and shake', () => {
    it('shakes the battle zone and recoils the creature on a hit', () => {
        rollsCrit(false);
        seed({power: 7});
        renderGame();

        fireEvent.click(attackButton());

        expect(document.querySelector('.shake')).not.toBeNull();
        expect(document.querySelector('.recoil')).not.toBeNull();
    });

    it('hits harder for a critical', () => {
        rollsCrit(true);
        seed({power: 7});
        renderGame();

        fireEvent.click(attackButton());

        expect(document.querySelector('.shake-hard')).not.toBeNull();
        expect(document.querySelector('.recoil-crit')).not.toBeNull();
    });
});

describe('sound toggle', () => {
    const toggle = () => screen.getByRole('button', {name: /mute sound/i});

    it('starts unmuted and flips', () => {
        seed();
        renderGame();

        expect(toggle().getAttribute('aria-pressed')).toBe('false');

        fireEvent.click(toggle());

        expect(toggle().getAttribute('aria-pressed')).toBe('true');
        expect(localStorage.getItem('clickhero-muted')).toBe('true');
    });

    it('remembers the choice on the next visit', () => {
        seed();
        renderGame();
        fireEvent.click(toggle());

        cleanup();
        resetAudioForTests();
        renderGame();

        expect(toggle().getAttribute('aria-pressed')).toBe('true');
    });
});
