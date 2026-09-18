import {type ReactNode, useCallback, useEffect, useMemo, useReducer, useRef} from "react";
import type {Bonus, Monster, PersistentState} from "../types/game.ts";
import {MONSTERS} from "../data/monsters.ts";
import {getMonsterById} from "../utils/gameLogic.ts";
import {clearLocalStorage, loadState, saveState} from "../utils/storage.ts";
import {createInitialGameState, gameReducer} from "../state/gameReducer.ts";
import {GameContext} from "./gameContext.ts";

interface GameContextProviderProps {
    children: ReactNode;
}

/** How long the attack button stays disabled after a hit. */
const ATTACK_COOLDOWN_MS = 300;

/** Writes are debounced so a click storm does not hit localStorage on every frame. */
const SAVE_DEBOUNCE_MS = 400;

export const GameContextProvider = ({children}: GameContextProviderProps) => {
    const [state, dispatch] = useReducer(gameReducer, undefined, () => createInitialGameState(loadState()));

    const cooldownRef = useRef<number | null>(null);

    // `dispatch` is stable for the lifetime of the provider, so every action below
    // keeps the same identity forever. That is what stops DpsTimer's interval from
    // being torn down and restarted on each state change — which used to mean a
    // clicking player never received a single tick of automatic damage.
    const attackMonster = useCallback(() => {
        if (cooldownRef.current !== null) return;

        dispatch({type: 'ATTACK'});
        cooldownRef.current = window.setTimeout(() => {
            cooldownRef.current = null;
            dispatch({type: 'ATTACK_END'});
        }, ATTACK_COOLDOWN_MS);
    }, []);

    const applyDps = useCallback(() => dispatch({type: 'TICK_DPS'}), []);

    const buyBonus = useCallback((bonus: Bonus) => dispatch({type: 'BUY_BONUS', bonus}), []);

    const clearProgress = useCallback(() => {
        clearLocalStorage();
        dispatch({type: 'RESET'});
    }, []);

    useEffect(() => () => {
        if (cooldownRef.current !== null) window.clearTimeout(cooldownRef.current);
    }, []);

    const currentMonster: Monster = useMemo(
        () => getMonsterById(state.currentMonsterId) ?? MONSTERS[0],
        [state.currentMonsterId]
    );

    // Only the saved fields, so a combat log line does not look like a state change
    // worth writing to disk.
    const persistentData: PersistentState = useMemo(() => ({
        gold: state.gold,
        power: state.power,
        dps: state.dps,
        bonuses: state.bonuses,
        currentMonsterId: state.currentMonsterId,
        monsterLife: state.monsterLife,
    }), [state.gold, state.power, state.dps, state.bonuses, state.currentMonsterId, state.monsterLife]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => saveState(persistentData), SAVE_DEBOUNCE_MS);
        return () => window.clearTimeout(timeoutId);
    }, [persistentData]);

    // A debounce alone loses the last few hundred milliseconds when the tab closes.
    useEffect(() => {
        const flush = () => saveState(persistentData);
        window.addEventListener('pagehide', flush);
        return () => window.removeEventListener('pagehide', flush);
    }, [persistentData]);

    const actions = useMemo(
        () => ({attackMonster, applyDps, buyBonus, clearProgress}),
        [attackMonster, applyDps, buyBonus, clearProgress]
    );

    const contextValue = useMemo(() => ({
        persistentData,
        monsterData: {currentMonster, monsterLife: state.monsterLife},
        combatData: {isAttacking: state.isAttacking, combatLog: state.combatLog},
        actions,
    }), [persistentData, currentMonster, state.monsterLife, state.isAttacking, state.combatLog, actions]);

    return (
        <GameContext.Provider value={contextValue}>
            {children}
        </GameContext.Provider>
    );
};
