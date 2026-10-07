import type {Bonus, PersistentState} from "../types/game.ts";
import {BONUSES} from "../data/monsters.ts";
import {clampDepth, monsterAt} from "./bestiary.ts";

const STORAGE_KEY = "clickhero-japan";

/** A year, refreshed on every save, so an active player never sees the save expire. */
const COOKIE_MAX_AGE_S = 60 * 60 * 24 * 365;

/** Browsers silently drop a cookie over 4096 bytes, name and attributes included. */
const COOKIE_MAX_BYTES = 4000;

/** Bumped whenever the saved shape changes in a way older saves cannot satisfy. */
const SCHEMA_VERSION = 3;

export function initialState(): PersistentState {
    return {
        gold: 20,
        power: 1,
        dps: 0,
        bonuses: BONUSES.map(b => ({...b})),
        depth: 1,
        monsterLife: monsterAt(1).life,
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

/**
 * v2 identified the current enemy by `currentMonsterId` into a fixed list of five.
 * v3 replaced that with an endless `depth`. The ids were 1..5 in order, so they map
 * straight across and a save from before the endless bestiary keeps its progress.
 */
function migrate(raw: Record<string, unknown>): Record<string, unknown> | null {
    if (raw.version === SCHEMA_VERSION) {
        return raw.state && typeof raw.state === 'object'
            ? raw.state as Record<string, unknown>
            : null;
    }

    if (raw.version === 2 && raw.state && typeof raw.state === 'object') {
        const old = raw.state as Record<string, unknown>;
        const {currentMonsterId, ...rest} = old;
        return {...rest, depth: isFiniteNumber(currentMonsterId) ? currentMonsterId : 1};
    }

    return null;
}

function isPersistentState(state: Record<string, unknown>): boolean {
    return (
        isFiniteNumber(state.gold) &&
        isFiniteNumber(state.power) &&
        isFiniteNumber(state.dps) &&
        isFiniteNumber(state.depth) &&
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
        // Saves lived in localStorage before the cookie; read one once so it is not lost.
        const rawData = readCookie() ?? localStorage.getItem(STORAGE_KEY);
        if (!rawData) return fresh;

        const parsedData: unknown = JSON.parse(rawData);

        if (!parsedData || typeof parsedData !== 'object') {
            console.warn('Invalid save data, starting a new game');
            return fresh;
        }

        const migrated = migrate(parsedData as Record<string, unknown>);

        if (!migrated || !isPersistentState(migrated)) {
            console.warn('Invalid save data, starting a new game');
            return fresh;
        }

        const saved = migrated as unknown as PersistentState;
        const depth = clampDepth(saved.depth);
        const monster = monsterAt(depth);

        return {
            gold: saved.gold,
            power: saved.power,
            dps: saved.dps,
            bonuses: reconcileBonuses(saved.bonuses),
            depth,
            monsterLife: Math.min(Math.max(saved.monsterLife, 1), monster.maxLife),
        };
    } catch (error) {
        console.error('Failed to load game data:', error);
        return fresh;
    }
}

function readCookie(): string | null {
    const prefix = `${STORAGE_KEY}=`;
    const entry = document.cookie.split('; ').find(c => c.startsWith(prefix));
    return entry ? decodeURIComponent(entry.slice(prefix.length)) : null;
}

function writeCookie(value: string, maxAgeS: number): void {
    document.cookie = `${STORAGE_KEY}=${value}; path=/; max-age=${maxAgeS}; SameSite=Lax`;
}

export function saveState(state: PersistentState): void {
    try {
        // Names and effects come back from the code on load (reconcileBonuses), so only
        // progress is written. That is what keeps the save far under the cookie limit.
        const bonuses = state.bonuses.map(({id, level, cost, power}) => ({id, level, cost, power}));
        const payload = {version: SCHEMA_VERSION, state: {...state, bonuses}};
        const value = encodeURIComponent(JSON.stringify(payload));

        if (value.length > COOKIE_MAX_BYTES) {
            console.error(`Save is ${value.length} bytes, too large for a cookie; not saved`);
            return;
        }

        writeCookie(value, COOKIE_MAX_AGE_S);
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('Failed to save game data:', error);
    }
}

export function clearSave(): void {
    try {
        writeCookie('', 0);
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('Failed to clear save:', error);
    }
}
