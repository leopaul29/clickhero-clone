import type {Bonus} from "../types/game.ts";

export interface GameState {
    gold: number;
    power: number;
    dps: number;
    bonuses: Bonus[];
}

export class GameStorage {
    private static instance: GameStorage;
    private pendingUpdates: Partial<GameState> = {};
    private saveTimeout: number | null = null;

    private currentState: GameState | null = null;

    static getInstance(): GameStorage {
        if (!GameStorage.instance) {
            GameStorage.instance = new GameStorage();
        }
        return GameStorage.instance;
    }

    getCurrentState(): GameState {
        if (!this.currentState) {
            this.currentState = this.loadFromStorage();
        }
        return this.currentState;
    }

    update(updates: Partial<GameState>): void {
        this.pendingUpdates = { ...this.pendingUpdates, ...updates };

        this.currentState = { ...this.getCurrentState(), ...updates };

        this.scheduleSave();
    }

    private scheduleSave(): void {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = window.setTimeout(() => {
            this.commitUpdates();
        }, 300);
    }

    private commitUpdates(): void {
        if (Object.keys(this.pendingUpdates).length === 0) return;

        try {
            const finalState = { ...this.getCurrentState(), ...this.pendingUpdates };
            localStorage.setItem('game-state', JSON.stringify(finalState));

            console.log(`💾 Saved ${Object.keys(this.pendingUpdates).length} updates:`, this.pendingUpdates);
            this.pendingUpdates = {};

        } catch (error) {
            console.error('Save failed:', error);
        }
    }

    forceSave(): void {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        this.commitUpdates();
    }

    private loadFromStorage(): GameState {
        try {
            const saved = localStorage.getItem('game-state');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('Load failed:', error);
        }

        return {
            gold: 20,
            power: 1,
            dps: 0,
            bonuses: []
        };
    }
}