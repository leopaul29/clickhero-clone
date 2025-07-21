import type {Bonus} from "../types/game.ts";

const STORAGE_KEY = "clickhero-japan"

export interface ClickheroStorage {
    gold:number;
    bonuses: Bonus[];
    power: number;
    dps:number;
}

const isValidStorageData = (data: unknown): data is ClickheroStorage => {
    if (!data || typeof data !== 'object') return false;

    const obj = data as Record<string, unknown>;
    return (
        typeof obj.gold === 'number' &&
        typeof obj.power === 'number' &&
        typeof obj.dps === 'number' &&
        Array.isArray(obj.bonuses)
    );
};

const DEFAULT_STORAGE: ClickheroStorage = {
    gold: 20,
    power: 1,
    dps: 0,
    bonuses: []
};

export function load(): ClickheroStorage {
    try {
        const rawData = localStorage.getItem(STORAGE_KEY);
        if (!rawData) return DEFAULT_STORAGE;

        const parsedData = JSON.parse(rawData);

        if (isValidStorageData(parsedData)) {
            return parsedData;
        }

        console.warn('Invalid storage data format, using defaults');
        return DEFAULT_STORAGE;
    } catch (error) {
        console.error('Failed to load game data:', error);
        return DEFAULT_STORAGE;
    }
}

function store(data: ClickheroStorage): void {
    try {
        console.log('storeService-store:', JSON.stringify(data));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error('Failed to save game data:', error);
    }
}

export function updateStorage(updates: Partial<ClickheroStorage>): void {
    const currentData = load();
    const updatedData = { ...currentData, ...updates };
    store(updatedData);
}

export function storeGold(gold: number): void {
    updateStorage({ gold });
}

export function storeBonuses(bonuses: Bonus[]): void {
    updateStorage({ bonuses });
}

export function storePower(power: number): void {
    updateStorage({ power });
}

export function storeDps(dps: number): void {
    updateStorage({ dps });
}

export function clearLocalStorage(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('Failed to clear storage:', error);
    }
}

export function createDebouncedUpdater(delay = 500) {
    let timeoutId: number | null = null;

    return (updates: Partial<ClickheroStorage>) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        timeoutId = window.setTimeout(() => {
            updateStorage(updates);
            timeoutId = null;
        }, delay);
    };
}