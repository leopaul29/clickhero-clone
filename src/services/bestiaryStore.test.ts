import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
    BATCH_SIZE, cacheFlavors, clearBestiaryCache, generateAhead, getCachedFlavor, missingDepths, readCache,
} from './bestiaryStore.ts';
import {HANDCRAFTED_DEPTH} from '../utils/bestiary.ts';

const CACHE_KEY = 'clickhero-bestiary';
const FIRST_GENERATED = HANDCRAFTED_DEPTH + 1;

const flavor = (name: string) => ({name, nameJp: '妖', emoji: '👻', description: 'A spirit'});

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe('cache', () => {
    it('round-trips flavour by depth', () => {
        cacheFlavors({[FIRST_GENERATED]: flavor('Yuki')});
        expect(getCachedFlavor(FIRST_GENERATED)?.name).toBe('Yuki');
    });

    it('returns null for an uncached depth', () => {
        expect(getCachedFlavor(999)).toBeNull();
    });

    it('rejects entries missing a field instead of caching a broken monster', () => {
        cacheFlavors({[FIRST_GENERATED]: {name: 'X', nameJp: '', emoji: '👻', description: 'd'}} as never);
        expect(getCachedFlavor(FIRST_GENERATED)).toBeNull();
    });

    it('survives a corrupt cache without throwing', () => {
        localStorage.setItem(CACHE_KEY, 'not json {{{');
        expect(readCache()).toEqual({});
        expect(getCachedFlavor(FIRST_GENERATED)).toBeNull();
    });

    it('drops malformed entries but keeps the good ones', () => {
        localStorage.setItem(CACHE_KEY, JSON.stringify({6: flavor('Good'), 7: {name: 'Bad'}}));
        const cache = readCache();
        expect(Object.keys(cache)).toEqual(['6']);
    });

    it('clears', () => {
        cacheFlavors({[FIRST_GENERATED]: flavor('Yuki')});
        clearBestiaryCache();
        expect(getCachedFlavor(FIRST_GENERATED)).toBeNull();
    });
});

describe('missingDepths', () => {
    it('never asks for the handcrafted opening', () => {
        expect(missingDepths(1).every(d => d > HANDCRAFTED_DEPTH)).toBe(true);
    });

    it('skips depths already cached', () => {
        cacheFlavors({[FIRST_GENERATED]: flavor('Yuki')});
        expect(missingDepths(FIRST_GENERATED)).not.toContain(FIRST_GENERATED);
    });

    it('asks for at most one batch', () => {
        expect(missingDepths(50).length).toBeLessThanOrEqual(BATCH_SIZE);
    });

    it('is empty once the window ahead is stocked', () => {
        const stocked = Object.fromEntries(
            Array.from({length: 20}, (_, i) => [FIRST_GENERATED + i, flavor(`Y${i}`)]),
        );
        cacheFlavors(stocked);
        expect(missingDepths(FIRST_GENERATED)).toEqual([]);
    });
});

describe('generateAhead', () => {
    const mockFetch = (impl: () => unknown) => {
        const spy = vi.fn(impl);
        vi.stubGlobal('fetch', spy);
        return spy;
    };

    it('caches what the proxy returns', async () => {
        mockFetch(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve({monsters: [{depth: FIRST_GENERATED, ...flavor('Nue')}]}),
        }));

        expect(await generateAhead(FIRST_GENERATED)).toBe(1);
        expect(getCachedFlavor(FIRST_GENERATED)?.name).toBe('Nue');
    });

    // Generation is a bonus, never a dependency. Every failure below must leave the
    // game playable on the procedural bestiary rather than surface an error.
    it('gives up quietly when the proxy is unreachable', async () => {
        mockFetch(() => Promise.reject(new Error('offline')));
        await expect(generateAhead(FIRST_GENERATED)).resolves.toBe(0);
    });

    it('gives up quietly on a non-OK response', async () => {
        mockFetch(() => Promise.resolve({ok: false, status: 500, json: () => Promise.resolve({})}));
        expect(await generateAhead(FIRST_GENERATED)).toBe(0);
    });

    it('gives up quietly on a malformed body', async () => {
        mockFetch(() => Promise.resolve({ok: true, json: () => Promise.resolve({monsters: 'nope'})}));
        expect(await generateAhead(FIRST_GENERATED)).toBe(0);
    });

    it('drops entries for depths it never asked for', async () => {
        mockFetch(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve({monsters: [{depth: 9_999, ...flavor('Smuggled')}]}),
        }));

        expect(await generateAhead(FIRST_GENERATED)).toBe(0);
        expect(getCachedFlavor(9_999)).toBeNull();
    });

    it('drops an entry missing a field', async () => {
        mockFetch(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve({monsters: [{depth: FIRST_GENERATED, name: 'Half'}]}),
        }));

        expect(await generateAhead(FIRST_GENERATED)).toBe(0);
    });

    it('makes no request when the window ahead is already stocked', async () => {
        const stocked = Object.fromEntries(
            Array.from({length: 20}, (_, i) => [FIRST_GENERATED + i, flavor(`Y${i}`)]),
        );
        cacheFlavors(stocked);
        const spy = mockFetch(() => Promise.resolve({ok: true, json: () => Promise.resolve({monsters: []})}));

        expect(await generateAhead(FIRST_GENERATED)).toBe(0);
        expect(spy).not.toHaveBeenCalled();
    });

    // A re-render must not fire a second request for depths already in flight.
    it('does not request the same depths twice concurrently', async () => {
        const spy = mockFetch(() => new Promise((resolve) => setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({monsters: [{depth: FIRST_GENERATED, ...flavor('Nue')}]}),
        }), 10)));

        const [a, b] = await Promise.all([generateAhead(FIRST_GENERATED), generateAhead(FIRST_GENERATED)]);

        expect(spy).toHaveBeenCalledTimes(1);
        expect(a + b).toBe(1);
    });
});
