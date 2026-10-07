import {beforeEach, describe, expect, it} from 'vitest';
import {
    createInitialGameState, CRIT_CHANCE, CRIT_MULTIPLIER, gameReducer, isCritRoll, MAX_LOG_ENTRIES,
} from './gameReducer.ts';
import {BONUSES} from '../data/monsters.ts';
import {initialState} from '../utils/storage.ts';
import {HANDCRAFTED_DEPTH, monsterAt} from '../utils/bestiary.ts';
import {collectionWithDps} from '../test/collection.ts';
import {ofudaCost} from '../utils/capture.ts';
import type {GameState} from '../types/game.ts';

const KAPPA = monsterAt(1);
const TENGU = monsterAt(2);

const state = (over: Partial<GameState> = {}): GameState => ({
    ...createInitialGameState(),
    ...over,
});

beforeEach(() => localStorage.clear());

describe('ATTACK', () => {
    it('removes the player power from the monster life', () => {
        const next = gameReducer(state({power: 4, monsterLife: 15}), {type: 'ATTACK'});
        expect(next.monsterLife).toBe(11);
        expect(next.isAttacking).toBe(true);
    });

    it('is ignored while an attack is already animating', () => {
        const current = state({power: 4, monsterLife: 15, isAttacking: true});
        expect(gameReducer(current, {type: 'ATTACK'})).toBe(current);
    });
});

describe('killing a monster', () => {
    it('pays the reward and advances to the next depth at full life', () => {
        const next = gameReducer(state({power: 999, gold: 0, monsterLife: KAPPA.life}), {type: 'ATTACK'});

        expect(next.gold).toBe(KAPPA.goldReward);
        expect(next.depth).toBe(2);
        expect(next.monsterLife).toBe(TENGU.life);
    });

    // The bestiary used to wrap with `% MONSTERS.length`, sending a maxed-out player
    // back to a 15 HP Kappa forever. Descending is now endless.
    it('descends past the handcrafted opening instead of wrapping', () => {
        const last = monsterAt(HANDCRAFTED_DEPTH);
        const next = gameReducer(
            state({power: 10_000, depth: HANDCRAFTED_DEPTH, monsterLife: last.life}),
            {type: 'ATTACK'},
        );

        expect(next.depth).toBe(HANDCRAFTED_DEPTH + 1);
        expect(next.monsterLife).toBeGreaterThan(last.life);
    });

    it('uses supplied flavour for the next depth when there is any', () => {
        const flavor = {name: 'Test Yokai', nameJp: 'テスト', emoji: '🎴', description: 'A generated one'};
        const last = monsterAt(HANDCRAFTED_DEPTH);
        const next = gameReducer(
            state({power: 10_000, depth: HANDCRAFTED_DEPTH, monsterLife: last.life}),
            {type: 'ATTACK', nextFlavor: flavor},
        );

        expect(monsterAt(next.depth, flavor).name).toBe('Test Yokai');
        expect(next.monsterLife).toBe(monsterAt(HANDCRAFTED_DEPTH + 1).life);
    });

    // damageMonster used to read monsterLife from a stale closure, so a click and a
    // DPS tick landing together could both see the pre-kill life and pay out twice.
    it('pays the reward once when two damage sources land on the same life', () => {
        const start = state({power: 999, shikigami: collectionWithDps(999), gold: 0, monsterLife: KAPPA.life});

        const afterBoth = gameReducer(gameReducer(start, {type: 'ATTACK'}), {type: 'TICK_DPS'});

        expect(afterBoth.gold).toBe(KAPPA.goldReward + TENGU.goldReward);
        expect(afterBoth.depth).toBe(3);
    });
});

describe('TICK_DPS', () => {
    it('deals what the collection is worth', () => {
        const next = gameReducer(state({shikigami: collectionWithDps(6), monsterLife: 15}), {type: 'TICK_DPS'});
        expect(next.monsterLife).toBe(9);
    });

    // An empty collection is the opening state of every new game: until the first
    // yōkai is sealed there is no automatic damage at all, and the click is the game.
    it('does nothing with an empty collection', () => {
        const current = state({shikigami: {}, monsterLife: 15});
        expect(gameReducer(current, {type: 'TICK_DPS'})).toBe(current);
    });
});

describe('BUY_BONUS', () => {
    const katana = BONUSES.find(b => b.effect === 'power')!;

    it('spends the gold and raises the matching stat', () => {
        const next = gameReducer(state({gold: 100, power: 1}), {type: 'BUY_BONUS', bonus: katana});

        expect(next.gold).toBe(100 - katana.cost);
        expect(next.power).toBe(1 + katana.power);
        expect(next.bonuses.find(b => b.id === katana.id)!.level).toBe(1);
    });

    // Chi Energy, the old "+3 automatic damage" purchase, is gone: the collection is
    // the engine now, and a bought DPS number beside it would be a second answer to
    // the same question. A save still holding it must not resurrect it.
    it('no longer sells automatic damage', () => {
        expect(BONUSES.some(b => b.id === 2)).toBe(false);
    });

    it('refuses the purchase when gold is short', () => {
        const current = state({gold: 0});
        expect(gameReducer(current, {type: 'BUY_BONUS', bonus: katana})).toBe(current);
    });

    // The shop passes the bonus it rendered; prices come from state so a stale
    // render cannot be replayed to buy at an old price.
    it('charges the current price, not the price on the passed bonus', () => {
        const stale = {...katana, cost: 1};
        const next = gameReducer(state({gold: 100}), {type: 'BUY_BONUS', bonus: stale});
        expect(next.gold).toBe(100 - katana.cost);
    });
});

describe('RESET', () => {
    it('returns to a real new game, not a stronger one', () => {
        const fresh = createInitialGameState();
        const next = gameReducer(
            state({gold: 9999, power: 500, shikigami: collectionWithDps(300), ofuda: 40, tekagen: true}),
            {type: 'RESET'},
        );

        expect(next.power).toBe(fresh.power);
        expect(next.gold).toBe(fresh.gold);
        expect(next.shikigami).toEqual({});
        expect(next.ofuda).toBe(fresh.ofuda);
        expect(next.tekagen).toBe(false);
        expect(next.bonuses.every(b => b.level === 0)).toBe(true);
    });
});

describe('combat log', () => {
    it('keeps only the most recent entries', () => {
        let current = state({power: 1, monsterLife: 500});
        for (let i = 0; i < MAX_LOG_ENTRIES + 3; i++) {
            current = gameReducer({...current, isAttacking: false}, {type: 'ATTACK'});
        }
        expect(current.combatLog).toHaveLength(MAX_LOG_ENTRIES);
    });
});

describe('BONUSES immutability', () => {
    it('does not mutate the shared BONUSES module data', () => {
        const before = JSON.parse(JSON.stringify(BONUSES));
        gameReducer(state({gold: 9999}), {type: 'BUY_BONUS', bonus: BONUSES[0]});
        expect(BONUSES).toEqual(before);
    });
});

describe('critical hits', () => {
    const crit = CRIT_CHANCE / 2;        // any roll under the threshold
    const normal = CRIT_CHANCE + 0.01;   // any roll over it

    it('multiplies the blow', () => {
        const next = gameReducer(state({power: 7, monsterLife: 10_000}), {type: 'ATTACK', roll: crit});

        expect(next.monsterLife).toBe(10_000 - 7 * CRIT_MULTIPLIER);
        expect(next.lastHit?.isCrit).toBe(true);
    });

    it('leaves an ordinary roll ordinary', () => {
        const next = gameReducer(state({power: 7, monsterLife: 10_000}), {type: 'ATTACK', roll: normal});

        expect(next.monsterLife).toBe(10_000 - 7);
        expect(next.lastHit?.isCrit).toBe(false);
    });

    // Randomness stays outside the reducer, as it does for generated flavour, so
    // no test ever has to stub a global to get a deterministic result.
    it('never crits when no roll was supplied', () => {
        const next = gameReducer(state({power: 7, monsterLife: 10_000}), {type: 'ATTACK'});

        expect(next.monsterLife).toBe(10_000 - 7);
        expect(next.lastHit?.isCrit).toBe(false);
    });

    it('names the critical in the combat log', () => {
        const next = gameReducer(state({power: 7, monsterLife: 10_000}), {type: 'ATTACK', roll: crit});
        expect(next.combatLog.at(-1)).toContain('会心の一撃');
    });

    it('does not let automatic damage crit', () => {
        const next = gameReducer(state({shikigami: collectionWithDps(7), monsterLife: 10_000}), {type: 'TICK_DPS'});
        expect(next.lastHit?.isCrit).toBe(false);
    });

    describe('isCritRoll', () => {
        it.each([[0, true], [CRIT_CHANCE - 0.001, true], [CRIT_CHANCE, false], [0.9, false]])(
            'maps %s to %s', (roll, expected) => {
                expect(isCritRoll(roll)).toBe(expected);
            });

        it('is false for a missing roll', () => {
            expect(isCritRoll(undefined)).toBe(false);
        });
    });
});

describe('lastHit', () => {
    it('records the blow for the UI to animate', () => {
        const next = gameReducer(state({power: 4, monsterLife: 100}), {type: 'ATTACK'});

        expect(next.lastHit).toMatchObject({amount: 4, isCrit: false, killed: false, source: 'click'});
    });

    it('marks automatic damage as dps, so it can stay silent', () => {
        const next = gameReducer(state({shikigami: collectionWithDps(4), monsterLife: 100}), {type: 'TICK_DPS'});
        expect(next.lastHit?.source).toBe('dps');
    });

    it('flags the killing blow', () => {
        const next = gameReducer(state({power: 9_999, monsterLife: 10}), {type: 'ATTACK'});
        expect(next.lastHit?.killed).toBe(true);
    });

    // Two identical hits must still be distinguishable, or the second one does not
    // replay its animation.
    it('gives every hit a new id, even identical ones', () => {
        const first = gameReducer(state({power: 4, monsterLife: 100}), {type: 'ATTACK'});
        const second = gameReducer({...first, isAttacking: false}, {type: 'ATTACK'});

        expect(second.lastHit!.id).toBeGreaterThan(first.lastHit!.id);
        expect(second.lastHit!.amount).toBe(first.lastHit!.amount);
    });

    it('starts empty and is cleared by a reset', () => {
        expect(createInitialGameState().lastHit).toBeNull();

        const hit = gameReducer(state({power: 4, monsterLife: 100}), {type: 'ATTACK'});
        expect(gameReducer(hit, {type: 'RESET'}).lastHit).toBeNull();
    });

    it('is not written to the save file', () => {
        const next = gameReducer(state({power: 4, monsterLife: 100}), {type: 'ATTACK'});
        expect(Object.keys(initialState())).not.toContain('lastHit');
        expect(next.lastHit).not.toBeNull();
    });
});

describe('手加減 (restraint)', () => {
    // The point of the stance: with it on, catching is reliable. That only holds if
    // the player's own upgraded click is capped too — a power-20 swing overkills a
    // 15 HP Kappa just as surely as the collection does.
    it('leaves a yōkai at one point of life instead of killing it', () => {
        const next = gameReducer(
            state({tekagen: true, power: 10_000, gold: 0, monsterLife: KAPPA.life}),
            {type: 'ATTACK'},
        );

        expect(next.monsterLife).toBe(1);
        expect(next.depth).toBe(1);
        expect(next.gold).toBe(0);
    });

    it('caps automatic damage the same way', () => {
        const next = gameReducer(
            state({tekagen: true, shikigami: collectionWithDps(10_000), monsterLife: KAPPA.life}),
            {type: 'TICK_DPS'},
        );

        expect(next.monsterLife).toBe(1);
    });

    // The swing still registers — the button greys for its cooldown, so the input is
    // not silently swallowed — but nothing about the fight moves.
    it('lands no damage once the yōkai is already at one point', () => {
        const current = state({tekagen: true, power: 50, gold: 7, monsterLife: 1});
        const next = gameReducer(current, {type: 'ATTACK'});

        expect(next.monsterLife).toBe(1);
        expect(next.gold).toBe(7);
        expect(next.combatLog).toEqual(current.combatLog);
        expect(next.lastHit).toBe(current.lastHit);
        expect(next.isAttacking).toBe(true);
    });

    it('lands no automatic damage either, and leaves the state untouched', () => {
        const current = state({tekagen: true, shikigami: collectionWithDps(50), monsterLife: 1});
        expect(gameReducer(current, {type: 'TICK_DPS'})).toBe(current);
    });

    it('still lets an ordinary blow through', () => {
        const next = gameReducer(state({tekagen: true, power: 4, monsterLife: 15}), {type: 'ATTACK'});
        expect(next.monsterLife).toBe(11);
    });

    // Opportunity cost is the whole penalty, so releasing it must restore the payout.
    it('released, the same blow kills and pays', () => {
        const next = gameReducer(
            state({tekagen: false, power: 10_000, gold: 0, monsterLife: KAPPA.life}),
            {type: 'ATTACK'},
        );

        expect(next.gold).toBe(KAPPA.goldReward);
        expect(next.depth).toBe(2);
    });

    it('is a toggle, and says so in the log', () => {
        const on = gameReducer(state({tekagen: false}), {type: 'TOGGLE_TEKAGEN'});
        expect(on.tekagen).toBe(true);
        expect(on.combatLog.at(-1)).toContain('手加減');

        expect(gameReducer(on, {type: 'TOGGLE_TEKAGEN'}).tekagen).toBe(false);
    });
});

describe('SEAL', () => {
    const weak = (over: Partial<GameState> = {}) =>
        state({ofuda: 3, monsterLife: 1, depth: 1, ...over});

    it('refuses a yōkai that is still too strong', () => {
        const current = weak({monsterLife: KAPPA.maxLife});
        expect(gameReducer(current, {type: 'SEAL'})).toBe(current);
    });

    it('refuses when there is no 御札 left', () => {
        const current = weak({ofuda: 0});
        expect(gameReducer(current, {type: 'SEAL'})).toBe(current);
    });

    it('spends one 御札, binds the species and descends', () => {
        const next = gameReducer(weak({gold: 100}), {type: 'SEAL'});

        expect(next.ofuda).toBe(2);
        expect(Object.keys(next.shikigami)).toHaveLength(1);
        expect(next.depth).toBe(2);
        expect(next.monsterLife).toBe(TENGU.life);
    });

    // Gold comes from kills, shikigami from catches. Paying both for a catch would
    // make restraint free, which is the one thing holding the loop together.
    it('pays no gold', () => {
        const next = gameReducer(weak({gold: 100}), {type: 'SEAL'});
        expect(next.gold).toBe(100);
    });

    // The reducer's own `monsterAt(depth)` returns the procedural stand-in. Sealing a
    // creature the model invented has to record the creature the player actually saw.
    it('records the flavour it was handed, not the one the depth would default to', () => {
        const flavor = {name: 'Test Yokai', nameJp: 'テスト', emoji: '🎴', description: 'A generated one'};
        const next = gameReducer(
            weak({depth: HANDCRAFTED_DEPTH + 1, monsterLife: 1}),
            {type: 'SEAL', flavor},
        );

        expect(Object.values(next.shikigami)[0]).toMatchObject({name: 'Test Yokai', nameJp: 'テスト'});
    });

    it('levels an already-bound species instead of adding a second entry', () => {
        const once = gameReducer(weak(), {type: 'SEAL'});
        const twice = gameReducer({...once, depth: 1, monsterLife: 1}, {type: 'SEAL'});

        expect(Object.keys(twice.shikigami)).toHaveLength(1);
        expect(Object.values(twice.shikigami)[0].level).toBe(2);
    });

    it('records the seal for the UI, with a fresh id each time', () => {
        const once = gameReducer(weak(), {type: 'SEAL'});
        const twice = gameReducer({...once, depth: 1, monsterLife: 1}, {type: 'SEAL'});

        expect(once.lastSeal).toMatchObject({nameJp: KAPPA.nameJp, isFirst: true, level: 1});
        expect(twice.lastSeal?.isFirst).toBe(false);
        expect(twice.lastSeal?.id).toBe((once.lastSeal?.id ?? 0) + 1);
    });

    /**
     * The inversion the whole design turns on: what you catch is what fights for you.
     * Before the first seal there is no automatic damage at all.
     */
    it('turns the catch into automatic damage', () => {
        const before = weak();
        expect(gameReducer(before, {type: 'TICK_DPS'})).toBe(before);

        const after = gameReducer(before, {type: 'SEAL'});
        const ticked = gameReducer(after, {type: 'TICK_DPS'});

        expect(ticked.monsterLife).toBeLessThan(after.monsterLife);
    });
});

describe('BUY_OFUDA', () => {
    it('spends the depth price and adds one talisman', () => {
        const price = ofudaCost(1);
        const next = gameReducer(state({gold: price, ofuda: 0, depth: 1}), {type: 'BUY_OFUDA'});

        expect(next.ofuda).toBe(1);
        expect(next.gold).toBe(0);
    });

    it('refuses when the gold is short', () => {
        const current = state({gold: ofudaCost(1) - 1, ofuda: 0, depth: 1});
        expect(gameReducer(current, {type: 'BUY_OFUDA'})).toBe(current);
    });
});

/**
 * The loop the design exists to produce, run end to end in one test:
 * restraint on → catch → the catch is the engine → restraint off → gold → another 御札.
 */
describe('the capture loop closes', () => {
    it('runs restraint → catch → damage → gold → talisman', () => {
        let s = state({tekagen: true, power: 10_000, ofuda: 1, gold: 0, monsterLife: KAPPA.life});

        s = gameReducer(s, {type: 'ATTACK'});
        expect(s.monsterLife).toBe(1);

        s = gameReducer(s, {type: 'SEAL'});
        expect(Object.keys(s.shikigami)).toHaveLength(1);
        expect(s.ofuda).toBe(0);

        // The bound spirit now deals damage the player never bought.
        const beforeTick = s.monsterLife;
        s = gameReducer(s, {type: 'TICK_DPS'});
        expect(s.monsterLife).toBeLessThan(beforeTick);

        // Out of talismans: the only way back is to release restraint and earn.
        s = gameReducer(s, {type: 'TOGGLE_TEKAGEN'});
        s = gameReducer({...s, isAttacking: false}, {type: 'ATTACK'});
        expect(s.gold).toBeGreaterThan(0);
    });
});
