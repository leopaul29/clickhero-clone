import {beforeEach, describe, expect, it} from 'vitest';
import {
    createInitialGameState, CRIT_CHANCE, CRIT_MULTIPLIER, gameReducer, isCritRoll, MAX_LOG_ENTRIES,
} from './gameReducer.ts';
import {BONUSES} from '../data/monsters.ts';
import {initialState} from '../utils/storage.ts';
import {HANDCRAFTED_DEPTH, monsterAt} from '../utils/bestiary.ts';
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
        const start = state({power: 999, dps: 999, gold: 0, monsterLife: KAPPA.life});

        const afterBoth = gameReducer(gameReducer(start, {type: 'ATTACK'}), {type: 'TICK_DPS'});

        expect(afterBoth.gold).toBe(KAPPA.goldReward + TENGU.goldReward);
        expect(afterBoth.depth).toBe(3);
    });
});

describe('TICK_DPS', () => {
    it('applies the dps value', () => {
        const next = gameReducer(state({dps: 6, monsterLife: 15}), {type: 'TICK_DPS'});
        expect(next.monsterLife).toBe(9);
    });

    it('does nothing at zero dps', () => {
        const current = state({dps: 0, monsterLife: 15});
        expect(gameReducer(current, {type: 'TICK_DPS'})).toBe(current);
    });
});

describe('BUY_BONUS', () => {
    const katana = BONUSES.find(b => b.effect === 'power')!;
    const chi = BONUSES.find(b => b.effect === 'dps')!;

    it('spends the gold and raises the matching stat', () => {
        const next = gameReducer(state({gold: 100, power: 1}), {type: 'BUY_BONUS', bonus: katana});

        expect(next.gold).toBe(100 - katana.cost);
        expect(next.power).toBe(1 + katana.power);
        expect(next.bonuses.find(b => b.id === katana.id)!.level).toBe(1);
    });

    it('raises dps for the dps bonus and leaves power alone', () => {
        const next = gameReducer(state({gold: 100, power: 1, dps: 0}), {type: 'BUY_BONUS', bonus: chi});

        expect(next.dps).toBe(chi.power);
        expect(next.power).toBe(1);
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
        const next = gameReducer(state({gold: 9999, power: 500, dps: 300}), {type: 'RESET'});

        expect(next.power).toBe(fresh.power);
        expect(next.gold).toBe(fresh.gold);
        expect(next.dps).toBe(0);
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
        const next = gameReducer(state({dps: 7, monsterLife: 10_000}), {type: 'TICK_DPS'});
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
        const next = gameReducer(state({dps: 4, monsterLife: 100}), {type: 'TICK_DPS'});
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
