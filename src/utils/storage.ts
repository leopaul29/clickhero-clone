import type {Bonus, PersistentState} from "../types/game.ts";
import {BONUSES, MONSTERS} from "../data/monsters.ts";
import {getMonsterById} from "./gameLogic.ts";

const STORAGE_KEY = "clickhero-japan";

/** Bumped whenever the saved shape changes in a way older saves cannot satisfy. */
const SCHEMA_VERSION = 2;

interface SavedGame {
    version: number;
    state: PersistentState;
}

export function initialState(): PersistentState {
    return {
        gold: 20,
        power: 1,
        dps: 0,
        bonuses: BONUSES.map(b => ({...b})),
        currentMonsterId: MONSTERS[0].id,
        monsterLife: MONSTERS[0].life,
    };
}

const isFiniteNumber = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value);

/**
 * Rebuild the bonus list from the code, carrying over only the player's progress.
 * Names, descriptions and effects always come from BONUSES, so a save made before
 * a bonus was renamed or added still loads.
 */
function reconcileBonuses(saved: unknown): Bonus[] {
    const savedList = Array.isArray(saved) ? saved : [];

    return BONUSES.map(bonus => {
        const match = savedList.find(
            (b): b is Partial<Bonus> =>
                !!b && typeof b === 'object' && (b as Partial<Bonus>).id === bonus.id
        );

        if (!match) return {...bonus};

        return {
            ...bonus,
            level: isFiniteNumber(match.level) ? match.level : bonus.level,
            cost: isFiniteNumber(match.cost) ? match.cost : bonus.cost,
            power: isFiniteNumber(match.power) ? match.power : bonus.power,
        };
    });
}

function isSavedGame(data: unknown): data is SavedGame {
    if (!data || typeof data !== 'object') return false;

    const obj = data as Record<string, unknown>;
    if (obj.version !== SCHEMA_VERSION) return false;
    if (!obj.state || typeof obj.state !== 'object') return false;

    const state = obj.state as Record<string, unknown>;
    return (
        isFiniteNumber(state.gold) &&
        isFiniteNumber(state.power) &&
        isFiniteNumber(state.dps) &&
        isFiniteNumber(state.currentMonsterId) &&
        isFiniteNumber(state.monsterLife) &&
        Array.isArray(state.bonuses)
    );
}

/**
 * The saved game, or a fresh one when nothing valid is stored.
 * Never throws: a corrupt save must not stop the game from starting.
 */
export function loadState(): PersistentState {
    const fresh = initialState();

    try {
        const rawData = localStorage.getItem(STORAGE_KEY);
        if (!rawData) return fresh;

        const parsedData: unknown = JSON.parse(rawData);

        if (!isSavedGame(parsedData)) {
            console.warn('Invalid save data, starting a new game');
            return fresh;
        }

        const saved = parsedData.state;
        const monster = getMonsterById(saved.currentMonsterId);

        // A save pointing at a monster that no longer exists restarts the bestiary
        // rather than locking the player on a missing enemy.
        if (!monster) return fresh;

        return {
            gold: saved.gold,
            power: saved.power,
            dps: saved.dps,
            bonuses: reconcileBonuses(saved.bonuses),
            currentMonsterId: monster.id,
            monsterLife: Math.min(Math.max(saved.monsterLife, 1), monster.maxLife),
        };
    } catch (error) {
        console.error('Failed to load game data:', error);
        return fresh;
    }
}

export function saveState(state: PersistentState): void {
    try {
        const payload: SavedGame = {version: SCHEMA_VERSION, state};
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
        console.error('Failed to save game data:', error);
    }
}

export function clearLocalStorage(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('Failed to clear storage:', error);
    }
}
