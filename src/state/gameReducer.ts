import type {Bonus, GameState, MonsterFlavor} from "../types/game.ts";
import {calculateReward, updateBonusesStats} from "../utils/gameLogic.ts";
import {monsterAt} from "../utils/bestiary.ts";
import {initialState} from "../utils/storage.ts";

/** How many combat log lines stay on screen. */
export const MAX_LOG_ENTRIES = 5;

export type GameAction =
    | { type: 'ATTACK'; nextFlavor?: MonsterFlavor | null }
    | { type: 'ATTACK_END' }
    | { type: 'TICK_DPS'; nextFlavor?: MonsterFlavor | null }
    | { type: 'BUY_BONUS'; bonus: Bonus }
    | { type: 'RESET' };

export function createInitialGameState(persisted = initialState()): GameState {
    return {...persisted, isAttacking: false, combatLog: []};
}

const appendLog = (log: string[], entry: string): string[] =>
    [...log, entry].slice(-MAX_LOG_ENTRIES);

/**
 * Apply damage and, if it kills, collect the reward and move on to the next monster.
 * Pure and atomic: the life, the gold and the monster always change together, so no
 * two damage sources in the same tick can read a stale life and kill twice.
 */
function damage(
    state: GameState,
    amount: number,
    source: string,
    nextFlavor?: MonsterFlavor | null,
): GameState {
    if (amount <= 0) return state;

    const monster = monsterAt(state.depth);
    const newLife = state.monsterLife - amount;

    if (newLife > 0) {
        return {
            ...state,
            monsterLife: newLife,
            combatLog: appendLog(state.combatLog, `${source}: -${amount} HP`),
        };
    }

    const reward = calculateReward(monster.goldReward, state.bonuses);
    // Flavour for the next depth is read outside the reducer and handed in, so
    // this stays pure: the same state and action always give the same result.
    const next = monsterAt(state.depth + 1, nextFlavor);

    return {
        ...state,
        gold: state.gold + reward,
        depth: next.depth,
        monsterLife: next.life,
        combatLog: appendLog(state.combatLog, `${monster.nameJp} defeated ! +${reward} 金`),
    };
}

function buyBonus(state: GameState, bonus: Bonus): GameState {
    const owned = state.bonuses.find(b => b.id === bonus.id);

    if (!owned || state.gold < owned.cost) return state;

    const {newBonusCost, newBonusPower} = updateBonusesStats(owned);

    return {
        ...state,
        gold: state.gold - owned.cost,
        power: owned.effect === 'power' ? state.power + owned.power : state.power,
        dps: owned.effect === 'dps' ? state.dps + owned.power : state.dps,
        bonuses: state.bonuses.map(b =>
            b.id === owned.id
                ? {...b, level: b.level + 1, cost: newBonusCost, power: newBonusPower}
                : b),
        combatLog: appendLog(state.combatLog, `${owned.nameJp} improved by ${owned.power}!`),
    };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
        case 'ATTACK':
            if (state.isAttacking) return state;
            return damage({...state, isAttacking: true}, state.power, "刀攻撃", action.nextFlavor);

        case 'ATTACK_END':
            return state.isAttacking ? {...state, isAttacking: false} : state;

        case 'TICK_DPS':
            return damage(state, state.dps, "Chi Energy", action.nextFlavor);

        case 'BUY_BONUS':
            return buyBonus(state, action.bonus);

        case 'RESET':
            return createInitialGameState();

        default:
            return state;
    }
}
