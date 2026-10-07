import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import App from '../App.tsx';
import {GameContextProvider} from '../contexts/GameContextProvider.tsx';
import {clearSave, initialState, saveState} from '../utils/storage.ts';
import {clearBestiaryCache} from '../services/bestiaryStore.ts';
import {HANDCRAFTED_DEPTH, monsterAt, proceduralFlavor} from '../utils/bestiary.ts';
import type {PersistentState} from '../types/game.ts';

const LAST_HANDCRAFTED = monsterAt(HANDCRAFTED_DEPTH);
const FIRST_GENERATED = HANDCRAFTED_DEPTH + 1;

const seed = (over: Partial<PersistentState> = {}) =>
    saveState({
        ...initialState(),
        depth: LAST_HANDCRAFTED.depth,
        monsterLife: LAST_HANDCRAFTED.life,
        power: 1_000_000,
        ...over,
    });

const renderGame = () => render(<GameContextProvider><App/></GameContextProvider>);
const attackButton = () => screen.getByRole('button', {name: /攻撃/});
const depthLabel = () => screen.getByText(/^深度 \d+$/).textContent;

const stubProxy = (monsters: (depths: number[]) => unknown[]) =>
    vi.stubGlobal('fetch', vi.fn((_url: string, init: {body: string}) => {
        const {depths} = JSON.parse(init.body) as {depths: number[]};
        return Promise.resolve({ok: true, json: () => Promise.resolve({monsters: monsters(depths)})});
    }));

const flavorFor = (depth: number) => ({
    depth, name: `Hone-onna ${depth}`, nameJp: `骨女${depth}`, emoji: '🩻', description: 'Bone woman of the deep',
});

beforeEach(() => {
    localStorage.clear();
    clearSave();
    clearBestiaryCache();
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('endless descent', () => {
    it('goes past the handcrafted opening instead of looping back to the first monster', async () => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
        seed();
        renderGame();

        expect(depthLabel()).toBe(`深度 ${HANDCRAFTED_DEPTH}`);

        fireEvent.click(attackButton());
        await waitFor(() => expect(depthLabel()).toBe(`深度 ${FIRST_GENERATED}`));

        expect(screen.getByText(proceduralFlavor(FIRST_GENERATED).nameJp)).toBeTruthy();
    });

    it('keeps the game playable with the proxy unreachable', async () => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
        seed();
        renderGame();

        for (let i = 0; i < 3; i++) {
            fireEvent.click(attackButton());
            await act(() => new Promise(resolve => setTimeout(resolve, 320)));
        }

        expect(depthLabel()).toBe(`深度 ${HANDCRAFTED_DEPTH + 3}`);
        expect(screen.queryByText(/✨ summoned/)).toBeNull();
    });
});

describe('generated bestiary', () => {
    it('uses generated flavour once it has been cached', async () => {
        stubProxy((depths) => depths.map(flavorFor));
        seed();
        renderGame();

        // Let the prefetch for the depths ahead land before descending.
        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
        await act(() => new Promise(resolve => setTimeout(resolve, 0)));

        fireEvent.click(attackButton());

        await waitFor(() => expect(screen.getByText(`骨女${FIRST_GENERATED}`)).toBeTruthy());
        expect(screen.getByText(/✨ summoned/)).toBeTruthy();
    });

    /**
     * Generation that lands mid-fight must upgrade the creature already on screen.
     * Otherwise the very first generated depth is almost always procedural, because
     * the player reaches it before the first round trip resolves.
     */
    it('upgrades a monster already on screen when generation arrives late', async () => {
        let release: (() => void) | undefined;
        const held = new Promise<void>(resolve => {release = resolve;});

        vi.stubGlobal('fetch', vi.fn((_url: string, init: {body: string}) => {
            const {depths} = JSON.parse(init.body) as {depths: number[]};
            return held.then(() => ({
                ok: true,
                json: () => Promise.resolve({monsters: depths.map(flavorFor)}),
            }));
        }));

        seed();
        renderGame();

        fireEvent.click(attackButton());
        await waitFor(() => expect(depthLabel()).toBe(`深度 ${FIRST_GENERATED}`));

        // The creature starts procedural, because nothing has arrived yet.
        expect(screen.getByText(proceduralFlavor(FIRST_GENERATED).nameJp)).toBeTruthy();

        release!();

        await waitFor(() => expect(screen.getByText(`骨女${FIRST_GENERATED}`)).toBeTruthy());
        expect(screen.queryByText(proceduralFlavor(FIRST_GENERATED).nameJp)).toBeNull();
    });

    it('does not let generated flavour change the monster stats', async () => {
        stubProxy((depths) => depths.map(flavorFor));
        seed();
        renderGame();

        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
        await act(() => new Promise(resolve => setTimeout(resolve, 0)));

        fireEvent.click(attackButton());
        await waitFor(() => expect(depthLabel()).toBe(`深度 ${FIRST_GENERATED}`));

        const expected = monsterAt(FIRST_GENERATED).maxLife.toLocaleString('en-US');
        expect(screen.getByText(new RegExp(`/${expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`))).toBeTruthy();
    });

    it('ignores flavour the proxy returns for a depth nobody asked for', async () => {
        stubProxy(() => [flavorFor(9_999)]);
        seed();
        renderGame();

        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
        await act(() => new Promise(resolve => setTimeout(resolve, 0)));

        fireEvent.click(attackButton());
        await waitFor(() => expect(depthLabel()).toBe(`深度 ${FIRST_GENERATED}`));

        expect(screen.getByText(proceduralFlavor(FIRST_GENERATED).nameJp)).toBeTruthy();
    });
});
