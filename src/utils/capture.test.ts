import {describe, expect, it} from 'vitest';
import {isSealable, ofudaCost, OFUDA_KILLS, SEAL_THRESHOLD, sealThresholdFor} from './capture.ts';
import {monsterAt, scaleStats} from './bestiary.ts';

const KAPPA = monsterAt(1);

describe('the seal window', () => {
    it('opens at the threshold fraction of max life', () => {
        expect(sealThresholdFor(100)).toBe(20);
        expect(sealThresholdFor(KAPPA.maxLife)).toBe(Math.floor(KAPPA.maxLife * SEAL_THRESHOLD));
    });

    // A yōkai so weak the band rounds to nothing would be uncatchable.
    it('is never narrower than a single point of life', () => {
        expect(sealThresholdFor(1)).toBe(1);
        expect(sealThresholdFor(3)).toBe(1);
    });

    it.each([
        [20, true, 'at the threshold'],
        [19, true, 'below it'],
        [21, false, 'above it'],
        [1, true, 'at one point'],
    ])('life %s is sealable: %s (%s)', (life, expected) => {
        expect(isSealable(life, 100)).toBe(expected);
    });

    // The whole mechanic is that overkill loses the catch. A corpse is not a catch.
    it('is closed on a dead yōkai', () => {
        expect(isSealable(0, 100)).toBe(false);
        expect(isSealable(-40, 100)).toBe(false);
    });

    /**
     * The design states the window in HP and lets the seconds fall out of it:
     * `(threshold × maxLife) / dps`. Nothing in the code measures time, so this
     * pins the property that makes that true — the band is the same fraction of
     * life at every depth, which is why no per-depth tuning exists.
     */
    it('is the same fraction of life at every depth', () => {
        for (const depth of [1, 5, 12, 40, 100]) {
            const {maxLife} = monsterAt(depth);
            expect(sealThresholdFor(maxLife) / maxLife).toBeCloseTo(SEAL_THRESHOLD, 1);
        }
    });
});

describe('ofuda price', () => {
    // The price is the one number the restraint economy balances on: catching has to
    // stay worth the same number of kills forever, or restraint quietly becomes free.
    it('is a constant number of kills at every depth', () => {
        for (const depth of [1, 5, 12, 40]) {
            expect(ofudaCost(depth)).toBe(Math.round(scaleStats(depth).goldReward * OFUDA_KILLS));
        }
    });

    it('rises with the depth, because the gold reward does', () => {
        expect(ofudaCost(10)).toBeGreaterThan(ofudaCost(1));
    });

    it('never falls below a price a player can be charged', () => {
        expect(ofudaCost(0)).toBeGreaterThanOrEqual(1);
        expect(ofudaCost(Number.NaN)).toBeGreaterThanOrEqual(1);
    });
});
