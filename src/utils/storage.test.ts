import {beforeEach, describe, expect, it, vi} from 'vitest';
import {clearLocalStorage, initialState, loadState, saveState} from './storage.ts';
import {BONUSES, MONSTERS} from '../data/monsters.ts';

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
        localStorage.setItem(STORAGE_KEY, JSON.stringify({version: 2, state: {...initialState(), gold: 'lots'}}));
        expect(loadState()).toEqual(initialState());
    });

    it('ignores a save written by an older schema', () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        localStorage.setItem(STORAGE_KEY, JSON.stringify({gold: 20, power: 1, dps: 0, bonuses: []}));
        expect(loadState()).toEqual(initialState());
    });

    it('restarts the bestiary when the saved monster no longer exists', () => {
        saveState({...initialState(), currentMonsterId: 4242, gold: 77});
        expect(loadState()).toEqual(initialState());
    });

    it('clamps a saved life that exceeds the monster maximum', () => {
        saveState({...initialState(), currentMonsterId: MONSTERS[0].id, monsterLife: 99999});
        expect(loadState().monsterLife).toBe(MONSTERS[0].maxLife);
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
