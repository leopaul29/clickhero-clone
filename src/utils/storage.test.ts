import {beforeEach, describe, expect, it, vi} from 'vitest';
import {clearLocalStorage, initialState, loadState, saveState} from './storage.ts';
import {BONUSES} from '../data/monsters.ts';
import {monsterAt} from './bestiary.ts';

const STORAGE_KEY = 'clickhero-japan';

beforeEach(() => localStorage.clear());

describe('loadState', () => {
    it('starts a new game when nothing is stored', () => {
        expect(loadState()).toEqual(initialState());
    });

    it('round-trips a saved game', () => {
        const saved = {...initialState(), gold: 512, power: 40, dps: 17, monsterLife: 9};
        saveState(saved);
        expect(loadState()).toEqual(saved);
    });

    it('falls back to a new game on unparsable JSON', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        localStorage.setItem(STORAGE_KEY, 'not json {{{');
        expect(loadState()).toEqual(initialState());
    });

    it('falls back to a new game when a field has the wrong type', () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        localStorage.setItem(STORAGE_KEY, JSON.stringify({version: 3, state: {...initialState(), gold: 'lots'}}));
        expect(loadState()).toEqual(initialState());
    });

    it('ignores a save with no recognisable version', () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        localStorage.setItem(STORAGE_KEY, JSON.stringify({gold: 20, power: 1, dps: 0, bonuses: []}));
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            version: 2,
            state: {gold: 640, power: 33, dps: 12, bonuses: [], currentMonsterId: 4, monsterLife: 50},
        }));

        const loaded = loadState();

        expect(loaded.depth).toBe(4);
        expect(loaded.gold).toBe(640);
        expect(loaded.power).toBe(33);
        expect(loaded.dps).toBe(12);
    });

    it('starts a new game for a version it does not know', () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        localStorage.setItem(STORAGE_KEY, JSON.stringify({version: 99, state: initialState()}));
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

describe('clearLocalStorage', () => {
    it('removes the save so the next load is a new game', () => {
        saveState({...initialState(), gold: 9999});
        clearLocalStorage();
        expect(loadState()).toEqual(initialState());
    });
});

describe('saveState', () => {
    it('does not throw when storage rejects the write', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError');
        });
        expect(() => saveState(initialState())).not.toThrow();
    });
});
