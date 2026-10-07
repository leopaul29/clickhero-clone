import type {Bonus, PersistentState, Shikigami, ShikigamiCollection} from "../types/game.ts";
import {BONUSES} from "../data/monsters.ts";
import {clampDepth, monsterAt} from "./bestiary.ts";
import {STARTING_OFUDA} from "./capture.ts";
import {speciesKey} from "./shikigami.ts";

const STORAGE_KEY = "clickhero-japan";

/**
 * The save lives in localStorage, not in a cookie.
 *
 * It was briefly a cookie, and the capture loop is why it is not any more: a cookie is
 * capped near 4 KB, and the shikigami collection crosses that at the sixteenth sealed
 * species — measured, not estimated. The whole point of the collection is a hundred of
 * them, so the cap lands in the middle of the core mechanic and the failure is silent.
 *
 * A cookie is also the wrong shape for this data even when it fits: it is uploaded with
 * every single HTTP request to the origin, and a save with no server to read it has no
 * business on the wire. localStorage holds megabytes and never leaves the browser.
 */

/** Bumped whenever the saved shape changes in a way older saves cannot satisfy. */
const SCHEMA_VERSION = 4;

export function initialState(): PersistentState {
    return {
        gold: 20,
        power: 1,
        bonuses: BONUSES.map(b => ({...b})),
        depth: 1,
        monsterLife: monsterAt(1).life,
        ofuda: STARTING_OFUDA,
        tekagen: false,
        shikigami: {},
    };
}

const isFiniteNumber = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value);

const asCount = (value: unknown, fallback: number): number =>
    isFiniteNumber(value) && value >= 0 ? Math.floor(value) : fallback;

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
 * Keep the collection entries that still describe a creature, drop the rest.
 *
 * The collection is the player's whole DPS, so a hand-edited or half-written save must
 * not be able to put a NaN in it — the key is re-derived from the name rather than
 * trusted, so two entries can never disagree about which species they are.
 */
function reconcileShikigami(saved: unknown): ShikigamiCollection {
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};

    const entries: ShikigamiCollection = {};

    for (const value of Object.values(saved as Record<string, unknown>)) {
        if (!value || typeof value !== 'object') continue;

        const raw = value as Partial<Shikigami>;

        if (typeof raw.name !== 'string' || !raw.name.trim()) continue;
        if (!isFiniteNumber(raw.depth) || raw.depth < 1) continue;

        const key = speciesKey(raw.name);

        entries[key] = {
            key,
            name: raw.name,
            nameJp: typeof raw.nameJp === 'string' && raw.nameJp ? raw.nameJp : raw.name,
            emoji: typeof raw.emoji === 'string' && raw.emoji ? raw.emoji : '🎴',
            depth: clampDepth(raw.depth),
            level: Math.max(1, asCount(raw.level, 1)),
            copies: asCount(raw.copies, 0),
        };
    }

    return entries;
}

/**
 * v2 identified the current enemy by `currentMonsterId` into a fixed list of five.
 * v3 replaced that with an endless `depth`. The ids were 1..5 in order, so they map
 * straight across and a save from before the endless bestiary keeps its progress.
 *
 * v4 made the shikigami collection the only source of automatic damage, so a stored
 * `dps` is dropped rather than carried: there is nowhere for it to live that would not
 * immediately disagree with the collection. A v3 player who had bought Chi Energy loses
 * that purchase and is handed a starting hand of 御札 to earn it back by catching.
 */
function migrate(raw: Record<string, unknown>): Record<string, unknown> | null {
    const version = raw.version;

    if (!raw.state || typeof raw.state !== 'object') return null;

    const state = raw.state as Record<string, unknown>;

    if (version === SCHEMA_VERSION) return state;

    if (version === 3) return state;

    if (version === 2) {
        const {currentMonsterId, ...rest} = state;
        return {...rest, depth: isFiniteNumber(currentMonsterId) ? currentMonsterId : 1};
    }

    return null;
}

function isPersistentState(state: Record<string, unknown>): boolean {
    return (
        isFiniteNumber(state.gold) &&
        isFiniteNumber(state.power) &&
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
        // A save from the cookie build is read only when localStorage holds nothing,
        // so anyone who played that version keeps their progress on the way back.
        const rawData = localStorage.getItem(STORAGE_KEY) ?? readLegacyCookie();
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
            bonuses: reconcileBonuses(saved.bonuses),
            depth,
            monsterLife: Math.min(Math.max(saved.monsterLife, 1), monster.maxLife),
            ofuda: asCount(saved.ofuda, STARTING_OFUDA),
            tekagen: saved.tekagen === true,
            shikigami: reconcileShikigami(saved.shikigami),
        };
    } catch (error) {
        console.error('Failed to load game data:', error);
        return fresh;
    }
}

/**
 * The save left behind by the cookie build, read once so that progress is not lost.
 * Removed as soon as a localStorage save is written over it.
 */
function readLegacyCookie(): string | null {
    try {
        const prefix = `${STORAGE_KEY}=`;
        const entry = document.cookie.split('; ').find(c => c.startsWith(prefix));
        const value = entry ? decodeURIComponent(entry.slice(prefix.length)) : '';
        return value || null;
    } catch {
        return null;
    }
}

function clearLegacyCookie(): void {
    try {
        document.cookie = `${STORAGE_KEY}=; path=/; max-age=0; SameSite=Lax`;
    } catch {
        // A browser refusing cookies has nothing to clear.
    }
}

export function saveState(state: PersistentState): void {
    try {
        // Names, descriptions and effects come back from the code on load
        // (reconcileBonuses), so only the player's progress is written. Kept from the
        // cookie build: it is a smaller save for no loss, whatever the store.
        const bonuses = state.bonuses.map(({id, level, cost, power}) => ({id, level, cost, power}));
        const payload = {version: SCHEMA_VERSION, state: {...state, bonuses}};

        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        clearLegacyCookie();
    } catch (error) {
        console.error('Failed to save game data:', error);
    }
}

export function clearSave(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
        clearLegacyCookie();
    } catch (error) {
        console.error('Failed to clear save:', error);
    }
}
