import type {Monster, ShikigamiCollection} from "../types/game.ts";
import {baseDps, speciesKey} from "../utils/shikigami.ts";

/**
 * A collection whose automatic damage is exactly `dps`.
 *
 * Tests used to seed a `dps` number directly. It is derived from the collection now,
 * so a test that needs a known tick rate has to express it as creatures — and this is
 * the one place that conversion lives.
 *
 * A depth-1 species deals exactly `baseDps(1)` per level, which the assertion below
 * pins: if the damage curve is ever retuned, this fails loudly instead of quietly
 * making every DPS test measure something other than what it says.
 */
export function collectionWithDps(dps: number): ShikigamiCollection {
    if (dps <= 0) return {};

    const unit = baseDps(1);

    if (dps % unit !== 0) {
        throw new Error(`collectionWithDps(${dps}): not a whole number of depth-1 levels (unit ${unit})`);
    }

    const key = speciesKey('Kappa');

    return {
        [key]: {key, name: 'Kappa', nameJp: '河童', emoji: '🐸', depth: 1, level: dps / unit, copies: 0},
    };
}

/** A monster fixture for catch tests, where only the flavour and depth matter. */
export const asMonster = (over: Partial<Monster> = {}): Monster => ({
    name: 'Kappa',
    nameJp: '河童',
    emoji: '🐸',
    description: 'River spirit',
    depth: 1,
    life: 15,
    maxLife: 15,
    goldReward: 3,
    origin: 'handcrafted',
    ...over,
});
