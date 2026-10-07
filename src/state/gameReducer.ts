import type {Bonus, GameState, Hit, MonsterFlavor, Seal} from "../types/game.ts";
import {calculateReward, updateBonusesStats} from "../utils/gameLogic.ts";
import {monsterAt} from "../utils/bestiary.ts";
import {isSealable, ofudaCost} from "../utils/capture.ts";
import {recordCatch, totalDps} from "../utils/shikigami.ts";
import {initialState} from "../utils/storage.ts";

/** How many combat log lines stay on screen. */
export const MAX_LOG_ENTRIES = 5;

/** Chance a click lands a critical hit, and what it multiplies damage by. */
export const CRIT_CHANCE = 0.05;
export const CRIT_MULTIPLIER = 10;

/**
 * Randomness lives outside the reducer: the caller rolls and hands the result in,
 * exactly as it does for generated flavour. An absent roll never crits, which keeps
 * every test deterministic without stubbing a global.
 */
export const isCritRoll = (roll?: number): boolean =>
    typeof roll === 'number' && roll < CRIT_CHANCE;

export type GameAction =
    | { type: 'ATTACK'; nextFlavor?: MonsterFlavor | null; roll?: number }
    | { type: 'ATTACK_END' }
    | { type: 'TICK_DPS'; nextFlavor?: MonsterFlavor | null }
    | { type: 'SEAL'; flavor?: MonsterFlavor | null; nextFlavor?: MonsterFlavor | null }
    | { type: 'BUY_BONUS'; bonus: Bonus }
    | { type: 'BUY_OFUDA' }
    | { type: 'TOGGLE_TEKAGEN' }
    | { type: 'RESET' };

export function createInitialGameState(persisted = initialState()): GameState {
    return {...persisted, isAttacking: false, combatLog: [], lastHit: null, lastSeal: null};
}

const nextHit = (
    state: GameState,
    amount: number,
    killed: boolean,
    {isCrit, source}: Pick<Hit, 'isCrit' | 'source'>,
): Hit => ({
    id: (state.lastHit?.id ?? 0) + 1,
    amount,
    isCrit,
    killed,
    source,
});

const appendLog = (log: string[], entry: string): string[] =>
    [...log, entry].slice(-MAX_LOG_ENTRIES);

/**
 * Apply damage and, if it kills, collect the reward and move on to the next monster.
 * Pure and atomic: the life, the gold and the monster always change together, so no
 * two damage sources in the same tick can read a stale life and kill twice.
 */
interface DamageOptions {
    isCrit?: boolean;
    by?: Hit['source'];
    nextFlavor?: MonsterFlavor | null;
}

function damage(
    state: GameState,
    amount: number,
    source: string,
    {isCrit = false, by = 'click', nextFlavor}: DamageOptions = {},
): GameState {
    // 手加減: while restraint is on, no blow can be the last one — the yōkai is left at
    // 1 HP so it can be sealed. The cap covers the player's own hand as well as the
    // shikigami, because a single upgraded click overkills a weak creature just as
    // surely as the collection does, and "catching becomes reliable" has to mean it.
    const dealt = state.tekagen ? Math.min(amount, state.monsterLife - 1) : amount;

    if (dealt <= 0) return state;

    const monster = monsterAt(state.depth);
    const newLife = state.monsterLife - dealt;

    if (newLife > 0) {
        return {
            ...state,
            monsterLife: newLife,
            lastHit: nextHit(state, dealt, false, {isCrit, source: by}),
            combatLog: appendLog(state.combatLog, `${source}: -${dealt} HP`),
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
        lastHit: nextHit(state, dealt, true, {isCrit, source: by}),
        combatLog: appendLog(state.combatLog, `${monster.nameJp} defeated ! +${reward} 金`),
    };
}

/**
 * Spend an 御札 to bind the yōkai in front of the player.
 *
 * The creature leaves the field without paying gold: kills pay, catches do not. That
 * split is what makes restraint cost something without needing a penalty bolted on.
 */
function seal(state: GameState, flavor?: MonsterFlavor | null, nextFlavor?: MonsterFlavor | null): GameState {
    if (state.ofuda <= 0) return state;

    const monster = monsterAt(state.depth, flavor);

    if (!isSealable(state.monsterLife, monster.maxLife)) return state;

    const {collection, entry, isFirst, isAwakening} = recordCatch(state.shikigami, monster);
    const next = monsterAt(state.depth + 1, nextFlavor);

    const lastSeal: Seal = {
        id: (state.lastSeal?.id ?? 0) + 1,
        nameJp: entry.nameJp,
        emoji: entry.emoji,
        level: entry.level,
        isFirst,
        isAwakening,
    };

    let combatLog = appendLog(
        state.combatLog,
        isFirst
            ? `${monster.nameJp} sealed — a new 式神 serves you !`
            : `${monster.nameJp} sealed — ${entry.nameJp} Lv.${entry.level}`,
    );

    if (isAwakening) combatLog = appendLog(combatLog, `覚醒 ! ${entry.nameJp} has awakened`);

    return {
        ...state,
        ofuda: state.ofuda - 1,
        shikigami: collection,
        depth: next.depth,
        monsterLife: next.life,
        lastSeal,
        combatLog,
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
        bonuses: state.bonuses.map(b =>
            b.id === owned.id
                ? {...b, level: b.level + 1, cost: newBonusCost, power: newBonusPower}
                : b),
        combatLog: appendLog(state.combatLog, `${owned.nameJp} improved by ${owned.power}!`),
    };
}

function buyOfuda(state: GameState): GameState {
    const cost = ofudaCost(state.depth);

    if (state.gold < cost) return state;

    return {
        ...state,
        gold: state.gold - cost,
        ofuda: state.ofuda + 1,
        combatLog: appendLog(state.combatLog, `御札 bought for ${cost} 金`),
    };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
        case 'ATTACK': {
            if (state.isAttacking) return state;

            const isCrit = isCritRoll(action.roll);
            const power = isCrit ? state.power * CRIT_MULTIPLIER : state.power;

            return damage(
                {...state, isAttacking: true},
                power,
                isCrit ? "会心の一撃" : "刀攻撃",
                {isCrit, by: 'click', nextFlavor: action.nextFlavor},
            );
        }

        case 'ATTACK_END':
            return state.isAttacking ? {...state, isAttacking: false} : state;

        // The collection is the engine: automatic damage is the sum of what the player
        // has sealed, never a stored number that could drift from it.
        case 'TICK_DPS':
            return damage(state, totalDps(state.shikigami), "式神", {by: 'dps', nextFlavor: action.nextFlavor});

        case 'SEAL':
            return seal(state, action.flavor, action.nextFlavor);

        case 'BUY_BONUS':
            return buyBonus(state, action.bonus);

        case 'BUY_OFUDA':
            return buyOfuda(state);

        case 'TOGGLE_TEKAGEN':
            return {
                ...state,
                tekagen: !state.tekagen,
                combatLog: appendLog(
                    state.combatLog,
                    state.tekagen ? '手加減 released — striking at full strength' : '手加減 — holding back',
                ),
            };

        case 'RESET':
            return createInitialGameState();

        default:
            return state;
    }
}
