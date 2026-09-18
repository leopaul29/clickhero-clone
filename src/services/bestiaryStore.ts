import type {MonsterFlavor} from "../types/game.ts";
import {clampDepth, HANDCRAFTED_DEPTH} from "../utils/bestiary.ts";

const CACHE_KEY = "clickhero-bestiary";

/** How far ahead of the player the bestiary is kept stocked. */
export const PREFETCH_AHEAD = 4;

/** Depths requested per call, so one round trip covers several kills. */
export const BATCH_SIZE = 5;

/** Endpoint of the serverless proxy that holds the API key. */
const ENDPOINT = "/api/bestiary";

type FlavorCache = Record<string, MonsterFlavor>;

const isFlavor = (value: unknown): value is MonsterFlavor => {
    if (!value || typeof value !== 'object') return false;
    const f = value as Record<string, unknown>;
    return ['name', 'nameJp', 'emoji', 'description']
        .every(key => typeof f[key] === 'string' && (f[key] as string).length > 0);
};

export function readCache(): FlavorCache {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return {};

        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return {};

        return Object.fromEntries(
            Object.entries(parsed as Record<string, unknown>).filter(([, v]) => isFlavor(v))
        ) as FlavorCache;
    } catch {
        // A corrupt cache costs flavour, never playability — the procedural
        // bestiary takes over and the game keeps descending.
        return {};
    }
}

function writeCache(cache: FlavorCache): void {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
        console.error('Failed to cache the bestiary:', error);
    }
}

export function getCachedFlavor(depth: number): MonsterFlavor | null {
    return readCache()[String(clampDepth(depth))] ?? null;
}

/**
 * Caching is a global event, not something one component owns.
 *
 * A request started while the player was at one depth usually resolves after they
 * have moved to the next, so tying "flavour arrived" to the lifetime of the effect
 * that asked for it drops exactly the case that matters — the first generated
 * depth, which the player always reaches before the first round trip returns.
 */
const listeners = new Set<() => void>();

export function subscribeBestiary(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function cacheFlavors(entries: Record<number, MonsterFlavor>): void {
    const cache = readCache();
    let changed = false;

    for (const [depth, flavor] of Object.entries(entries)) {
        if (isFlavor(flavor)) {
            cache[depth] = flavor;
            changed = true;
        }
    }

    if (!changed) return;

    writeCache(cache);
    listeners.forEach(listener => listener());
}

export function clearBestiaryCache(): void {
    try {
        localStorage.removeItem(CACHE_KEY);
    } catch (error) {
        console.error('Failed to clear the bestiary cache:', error);
    }
}

/** Depths at or past the generated range that have no flavour cached yet. */
export function missingDepths(fromDepth: number, ahead = PREFETCH_AHEAD): number[] {
    const cache = readCache();
    const start = Math.max(clampDepth(fromDepth), HANDCRAFTED_DEPTH + 1);

    const wanted: number[] = [];
    for (let depth = start; depth <= start + ahead; depth++) {
        if (!cache[String(depth)]) wanted.push(depth);
    }

    return wanted.slice(0, BATCH_SIZE);
}

/** In-flight depths, so a re-render cannot fire the same request twice. */
const pending = new Set<number>();

/**
 * Ask the proxy for flavour for the depths just ahead of the player and cache it.
 *
 * Resolves to the number of depths newly cached. Never throws and never blocks
 * play: on any failure the caller simply keeps using the procedural bestiary.
 */
export async function generateAhead(fromDepth: number, signal?: AbortSignal): Promise<number> {
    const depths = missingDepths(fromDepth).filter(d => !pending.has(d));
    if (depths.length === 0) return 0;

    depths.forEach(d => pending.add(d));

    try {
        const response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({depths}),
            signal,
        });

        if (!response.ok) return 0;

        const payload: unknown = await response.json();
        const monsters = (payload as {monsters?: unknown})?.monsters;
        if (!Array.isArray(monsters)) return 0;

        const entries: Record<number, MonsterFlavor> = {};
        for (const entry of monsters) {
            const depth = (entry as {depth?: unknown})?.depth;
            if (typeof depth === 'number' && depths.includes(depth) && isFlavor(entry)) {
                entries[depth] = {
                    name: entry.name,
                    nameJp: entry.nameJp,
                    emoji: entry.emoji,
                    description: entry.description,
                };
            }
        }

        cacheFlavors(entries);
        return Object.keys(entries).length;
    } catch {
        return 0;
    } finally {
        depths.forEach(d => pending.delete(d));
    }
}
