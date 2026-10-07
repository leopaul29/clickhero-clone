import {type ReactNode, useCallback, useEffect, useMemo, useReducer, useRef, useState} from "react";
import type {Bonus, Monster, MonsterFlavor, PersistentState} from "../types/game.ts";
import {monsterAt} from "../utils/bestiary.ts";
import {isSealable, ofudaCost, sealThresholdFor} from "../utils/capture.ts";
import {totalDps} from "../utils/shikigami.ts";
import {generateAhead, getCachedFlavor, subscribeBestiary} from "../services/bestiaryStore.ts";
import {clearLocalStorage, loadState, saveState} from "../utils/storage.ts";
import {playCrit, playFirstSeal, playHit, playKill, playPurchase, playSeal} from "../utils/audio.ts";
import {createInitialGameState, gameReducer} from "../state/gameReducer.ts";
import {GameContext} from "./gameContext.ts";

interface GameContextProviderProps {
    children: ReactNode;
}

/** How long the attack button stays disabled after a hit. */
const ATTACK_COOLDOWN_MS = 300;

/** Writes are debounced so a click storm does not rewrite the save cookie on every frame. */
const SAVE_DEBOUNCE_MS = 400;

export const GameContextProvider = ({children}: GameContextProviderProps) => {
    const [state, dispatch] = useReducer(gameReducer, undefined, () => createInitialGameState(loadState()));

    const cooldownRef = useRef<number | null>(null);

    // The reducer must stay pure, so the cache is read here and the flavour for the
    // next depth travels with the action. `depth` lives in a ref rather than a
    // dependency so the actions below keep their stable identity.
    const depthRef = useRef(state.depth);
    depthRef.current = state.depth;

    const nextFlavor = useCallback(() => getCachedFlavor(depthRef.current + 1), []);

    // `dispatch` is stable for the lifetime of the provider, so every action below
    // keeps the same identity forever. That is what stops DpsTimer's interval from
    // being torn down and restarted on each state change — which used to mean a
    // clicking player never received a single tick of automatic damage.
    const attackMonster = useCallback(() => {
        if (cooldownRef.current !== null) return;

        dispatch({type: 'ATTACK', nextFlavor: nextFlavor(), roll: Math.random()});
        cooldownRef.current = window.setTimeout(() => {
            cooldownRef.current = null;
            dispatch({type: 'ATTACK_END'});
        }, ATTACK_COOLDOWN_MS);
    }, [nextFlavor]);

    const applyDps = useCallback(() => dispatch({type: 'TICK_DPS', nextFlavor: nextFlavor()}), [nextFlavor]);

    const buyBonus = useCallback((bonus: Bonus) => {
        dispatch({type: 'BUY_BONUS', bonus});
        playPurchase();
    }, []);

    const buyOfuda = useCallback(() => {
        dispatch({type: 'BUY_OFUDA'});
        playPurchase();
    }, []);

    const toggleTekagen = useCallback(() => dispatch({type: 'TOGGLE_TEKAGEN'}), []);

    const clearProgress = useCallback(() => {
        clearSave();
        dispatch({type: 'RESET'});
    }, []);

    useEffect(() => () => {
        if (cooldownRef.current !== null) window.clearTimeout(cooldownRef.current);
    }, []);

    // Flavour that landed after the monster was already on screen. Without this, a
    // creature first drawn from the procedural bestiary would stay procedural for
    // the rest of its fight even though generation arrived a moment later. Stats do
    // not depend on flavour, so swapping it cannot change the battle in progress.
    const [arrived, setArrived] = useState<{ depth: number; flavor: MonsterFlavor | null } | null>(null);

    const currentMonster: Monster = useMemo(() => {
        // Falls back to a direct read on the frame a new depth begins, before any
        // generation for it has landed.
        const flavor = arrived?.depth === state.depth ? arrived.flavor : getCachedFlavor(state.depth);
        return monsterAt(state.depth, flavor);
    }, [state.depth, arrived]);

    // What the player is actually looking at, so the collection records the creature
    // they saw rather than the procedural stand-in for its depth. A ref, for the same
    // reason `depth` is one: sealing must not be the action that breaks the DPS timer.
    const currentFlavorRef = useRef<MonsterFlavor>(currentMonster);
    currentFlavorRef.current = currentMonster;

    const sealMonster = useCallback(
        () => dispatch({type: 'SEAL', flavor: currentFlavorRef.current, nextFlavor: nextFlavor()}),
        [nextFlavor],
    );

    // Keep the bestiary stocked a few depths ahead of the player. Failure is silent
    // and harmless: the procedural bestiary already covers every depth.
    useEffect(() => {
        const controller = new AbortController();

        void generateAhead(state.depth, controller.signal);

        return () => controller.abort();
    }, [state.depth]);

    // Sound follows the hit rather than the click, because whether it was a
    // critical or a kill is only known once the reducer has run. A per-second DPS
    // tick stays silent — it would be a metronome.
    // The reducer mints a fresh Hit for every blow, so depending on the object
    // itself fires exactly once per hit and needs no dependency suppression.
    const lastHit = state.lastHit;
    useEffect(() => {
        if (!lastHit) return;

        if (lastHit.killed) playKill();
        else if (lastHit.source === 'click') (lastHit.isCrit ? playCrit : playHit)();
    }, [lastHit]);

    // Seals carry their own fresh id for exactly the same reason hits do.
    const lastSeal = state.lastSeal;
    useEffect(() => {
        if (!lastSeal) return;

        (lastSeal.isFirst ? playFirstSeal : playSeal)();
    }, [lastSeal]);

    // Re-read whenever anything lands in the cache, whichever depth asked for it.
    useEffect(() => subscribeBestiary(() => {
        const depth = depthRef.current;
        setArrived({depth, flavor: getCachedFlavor(depth)});
    }), []);

    // Only the saved fields, so a combat log line does not look like a state change
    // worth writing to disk.
    const persistentData: PersistentState = useMemo(() => ({
        gold: state.gold,
        power: state.power,
        bonuses: state.bonuses,
        depth: state.depth,
        monsterLife: state.monsterLife,
        ofuda: state.ofuda,
        tekagen: state.tekagen,
        shikigami: state.shikigami,
    }), [
        state.gold, state.power, state.bonuses, state.depth, state.monsterLife,
        state.ofuda, state.tekagen, state.shikigami,
    ]);

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

    // Automatic damage is read from the collection every render rather than stored,
    // so there is no second copy of it that a save or a migration could contradict.
    const captureData = useMemo(() => ({
        dps: totalDps(state.shikigami),
        sealThreshold: sealThresholdFor(currentMonster.maxLife),
        canSeal: state.ofuda > 0 && isSealable(state.monsterLife, currentMonster.maxLife),
        ofudaCost: ofudaCost(state.depth),
    }), [state.shikigami, state.monsterLife, state.ofuda, state.depth, currentMonster.maxLife]);

    const actions = useMemo(
        () => ({attackMonster, applyDps, buyBonus, buyOfuda, sealMonster, toggleTekagen, clearProgress}),
        [attackMonster, applyDps, buyBonus, buyOfuda, sealMonster, toggleTekagen, clearProgress]
    );

    const contextValue = useMemo(() => ({
        persistentData,
        monsterData: {currentMonster, monsterLife: state.monsterLife, depth: state.depth},
        combatData: {isAttacking: state.isAttacking, combatLog: state.combatLog, lastHit, lastSeal},
        captureData,
        actions,
    }), [
        persistentData, currentMonster, state.depth, state.monsterLife, state.isAttacking,
        state.combatLog, lastHit, lastSeal, captureData, actions,
    ]);

    return (
        <GameContext.Provider value={contextValue}>
            {children}
        </GameContext.Provider>
    );
};
