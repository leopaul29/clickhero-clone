import {beforeEach, describe, expect, it, vi} from 'vitest';
import {clearSave, initialState, loadState, saveState} from './storage.ts';
import type {Shikigami} from '../types/game.ts';
import {BONUSES} from '../data/monsters.ts';
import {monsterAt} from './bestiary.ts';
import {STARTING_OFUDA} from './capture.ts';
import {collectionWithDps} from '../test/collection.ts';

const STORAGE_KEY = 'clickhero-japan';

/** Store a raw save exactly as the browser would hold it. */
const setRawCookie = (raw: string) => {
    document.cookie = `${STORAGE_KEY}=${encodeURIComponent(raw)}; path=/`;
};

beforeEach(() => {
    localStorage.clear();
    clearSave();
});

describe('loadState', () => {
    it('starts a new game when nothing is stored', () => {
        expect(loadState()).toEqual(initialState());
    });

    it('round-trips a saved game, collection and stance included', () => {
        const saved = {
            ...initialState(),
            gold: 512,
            power: 40,
            monsterLife: 9,
            ofuda: 11,
            tekagen: true,
            shikigami: collectionWithDps(4),
        };
        saveState(saved);
        expect(loadState()).toEqual(saved);
    });

    it('falls back to a new game on unparsable JSON', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        setRawCookie('not json {{{');
        expect(loadState()).toEqual(initialState());
    });

    it('falls back to a new game when a field has the wrong type', () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        setRawCookie(JSON.stringify({version: 3, state: {...initialState(), gold: 'lots'}}));
        expect(loadState()).toEqual(initialState());
    });

    it('ignores a save with no recognisable version', () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        setRawCookie(JSON.stringify({gold: 20, power: 1, dps: 0, bonuses: []}));
        expect(loadState()).toEqual(initialState());
    });

    it('clamps a saved life that exceeds the monster maximum', () => {
        saveState({...initialState(), depth: 1, monsterLife: 99999});
        expect(loadState().monsterLife).toBe(monsterAt(1).maxLife);
    });

    it('accepts a depth beyond the handcrafted opening', () => {
        saveState({...initialState(), depth: 40, monsterLife: 10});
        expect(loadState().depth).toBe(40);
    });
});

describe('schema migration', () => {
    // v2 pointed at one of five monsters by id; v3 descends by depth. The ids were
    // 1..5 in order, so a save from before the endless bestiary keeps its progress.
    it('carries a v2 save forward, mapping currentMonsterId to depth', () => {
        setRawCookie(JSON.stringify({
            version: 2,
            state: {gold: 640, power: 33, dps: 12, bonuses: [], currentMonsterId: 4, monsterLife: 50},
        }));

        const loaded = loadState();

        expect(loaded.depth).toBe(4);
        expect(loaded.gold).toBe(640);
        expect(loaded.power).toBe(33);
    });

    // v4 made the shikigami collection the only source of automatic damage. A v3 save
    // carries a `dps` number with nowhere to live, so it is dropped rather than
    // trusted — and the player is handed a starting hand of 御札 to earn it back.
    it('drops the stored dps from a v3 save and hands back a starting hand', () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            version: 3,
            state: {gold: 640, power: 33, dps: 12, bonuses: [], depth: 4, monsterLife: 50},
        }));

        const loaded = loadState();

        expect(loaded).not.toHaveProperty('dps');
        expect(loaded.depth).toBe(4);
        expect(loaded.gold).toBe(640);
        expect(loaded.shikigami).toEqual({});
        expect(loaded.ofuda).toBe(STARTING_OFUDA);
        expect(loaded.tekagen).toBe(false);
    });

    it('starts a new game for a version it does not know', () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        setRawCookie(JSON.stringify({version: 99, state: initialState()}));
        expect(loadState()).toEqual(initialState());
    });
});

describe('bonus reconciliation', () => {
    // Option B will add monsters and bonuses. A save made before that must still load.
    it('keeps player progress but takes names and effects from the code', () => {
        const saved = initialState();
        saved.bonuses = [{...BONUSES[0], level: 7, cost: 900, power: 88, name: 'Old Name', effect: 'goldMultiplier'}];
        saveState(saved);

        const loaded = loadState();
        const katana = loaded.bonuses.find(b => b.id === BONUSES[0].id)!;

        expect(loaded.bonuses).toHaveLength(BONUSES.length);
        expect(katana.level).toBe(7);
        expect(katana.cost).toBe(900);
        expect(katana.power).toBe(88);
        expect(katana.name).toBe(BONUSES[0].name);
        expect(katana.effect).toBe(BONUSES[0].effect);
    });

    it('gives a bonus missing from the save its starting values', () => {
        const saved = initialState();
        saved.bonuses = [{...BONUSES[0], level: 3}];
        saveState(saved);

        const loaded = loadState();
        expect(loaded.bonuses).toHaveLength(BONUSES.length);
        expect(loaded.bonuses[1]).toEqual(BONUSES[1]);
    });

    it('does not mutate the shared BONUSES module data', () => {
        const before = JSON.parse(JSON.stringify(BONUSES));
        const loaded = loadState();
        loaded.bonuses[0].level = 42;
        expect(BONUSES).toEqual(before);
    });
});

describe('where the save lives', () => {
    it('writes the save to localStorage', () => {
        saveState({...initialState(), gold: 77});

        expect(localStorage.getItem(STORAGE_KEY)).toContain('"gold":77');
        expect(document.cookie).not.toContain(`${STORAGE_KEY}=`);
    });

    it('writes only the player progress of each bonus, not its text', () => {
        saveState({...initialState(), gold: 77});

        const raw = localStorage.getItem(STORAGE_KEY) ?? '';

        expect(raw).not.toContain('Katana Power');
        expect(raw).not.toContain('Increases attack power');
    });

    /**
     * The reason this is not a cookie. The save was briefly cookie-backed, which refused
     * anything over 4 KB — and a shikigami collection crosses that at the sixteenth
     * sealed species, in the middle of the mechanic the whole game is built on. A full
     * collection is roughly 15 KB and has to survive a round trip untouched.
     */
    it('round-trips a collection far larger than a cookie could hold', () => {
        const shikigami: Record<string, Shikigami> = {};

        for (let i = 1; i <= 100; i++) {
            const name = `Yokai Number ${i}`;
            const key = name.toLowerCase();
            shikigami[key] = {key, name, nameJp: `妖怪第${i}号`, emoji: '👹', depth: i, level: 1 + (i % 9), copies: i % 4};
        }

        const saved = {...initialState(), gold: 999_999, depth: 100, shikigami};
        saveState(saved);

        const raw = localStorage.getItem(STORAGE_KEY) ?? '';
        expect(raw.length).toBeGreaterThan(4_000);

        const loaded = loadState();
        expect(Object.keys(loaded.shikigami)).toHaveLength(100);
        expect(loaded.shikigami).toEqual(shikigami);
    });

    // The save lived in a cookie for one build; a player who played it keeps their game.
    it('reads a save left behind by the cookie build, then clears the cookie', () => {
        const legacy = JSON.stringify({version: 4, state: {...initialState(), gold: 4242}});
        document.cookie = `${STORAGE_KEY}=${encodeURIComponent(legacy)}; path=/`;

        expect(loadState().gold).toBe(4242);

        saveState(loadState());

        expect(document.cookie).not.toContain(`${STORAGE_KEY}=`);
        expect(loadState().gold).toBe(4242);
    });

    // Otherwise a stale cookie would quietly outrank a newer localStorage save.
    it('prefers localStorage over a cookie when both exist', () => {
        const stale = JSON.stringify({version: 4, state: {...initialState(), gold: 1}});
        document.cookie = `${STORAGE_KEY}=${encodeURIComponent(stale)}; path=/`;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({version: 4, state: {...initialState(), gold: 5555}}));

        expect(loadState().gold).toBe(5555);
    });
});

describe('clearSave', () => {
    it('removes the save so the next load is a new game', () => {
        saveState({...initialState(), gold: 9999});
        clearSave();
        expect(loadState()).toEqual(initialState());
    });

    it('also removes a legacy localStorage save', () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({version: 3, state: {...initialState(), gold: 9999}}));
        clearSave();
        expect(loadState()).toEqual(initialState());
    });
});

describe('saveState', () => {
    it('does not throw when the browser rejects the write', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(Document.prototype, 'cookie', 'set').mockImplementation(() => {
            throw new Error('SecurityError');
        });
        expect(() => saveState(initialState())).not.toThrow();
    });
});

describe('shikigami reconciliation', () => {
    // The collection is the player's entire automatic damage, so a hand-edited or
    // half-written save must not be able to put a NaN or a level 0 into the engine.
    const save = (shikigami: unknown) =>
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            version: 4,
            state: {...initialState(), shikigami},
        }));

    it('keeps a well-formed entry', () => {
        save({kappa: {key: 'kappa', name: 'Kappa', nameJp: '河童', emoji: '🐸', depth: 3, level: 4, copies: 2}});

        expect(loadState().shikigami.kappa).toEqual({
            key: 'kappa', name: 'Kappa', nameJp: '河童', emoji: '🐸', depth: 3, level: 4, copies: 2,
        });
    });

    it.each([
        ['a missing name', {depth: 2, level: 1}],
        ['a blank name', {name: '   ', depth: 2, level: 1}],
        ['no depth', {name: 'Kappa', level: 1}],
        ['a depth that is not a number', {name: 'Kappa', depth: 'deep', level: 1}],
        ['not an object at all', 'kappa'],
    ])('drops an entry with %s', (_label, entry) => {
        save({kappa: entry});
        expect(loadState().shikigami).toEqual({});
    });

    it('re-derives the key from the name, so the two cannot disagree', () => {
        save({'wrong-key': {key: 'wrong-key', name: 'Nue', nameJp: '鵺', emoji: '🌑', depth: 9, level: 1, copies: 0}});

        const loaded = loadState().shikigami;

        expect(Object.keys(loaded)).toEqual(['nue']);
        expect(loaded.nue.key).toBe('nue');
    });

    it('floors a level at one, so an entry always deals damage', () => {
        save({kappa: {name: 'Kappa', depth: 1, level: 0, copies: -5}});

        const entry = loadState().shikigami.kappa;

        expect(entry.level).toBe(1);
        expect(entry.copies).toBe(0);
    });

    it('is empty when the saved collection is not an object', () => {
        save(['kappa']);
        expect(loadState().shikigami).toEqual({});
    });
});

describe('ofuda and stance', () => {
    it('hands a fresh game a starting hand so the first catch is reachable', () => {
        expect(initialState().ofuda).toBe(STARTING_OFUDA);
        expect(initialState().tekagen).toBe(false);
    });

    it('refuses a negative or non-numeric ofuda count', () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            version: 4,
            state: {...initialState(), ofuda: -3},
        }));

        expect(loadState().ofuda).toBe(STARTING_OFUDA);
    });

    it('treats anything but true as restraint off', () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            version: 4,
            state: {...initialState(), tekagen: 'yes'},
        }));

        expect(loadState().tekagen).toBe(false);
    });
});
