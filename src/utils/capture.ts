import {clampDepth, scaleStats} from "./bestiary.ts";

/**
 * How weak a yōkai must be before an 御札 will hold it, as a fraction of its max life.
 *
 * There is deliberately no timer anywhere in the seal. The window the player feels is
 * this band divided by their damage output — `(SEAL_THRESHOLD × maxLife) / dps` seconds —
 * so a fast build gets a knife-edge and a slow one gets room, with nothing to tune per
 * depth. A capture animation would be a tax paid on every one of a hundred catches.
 */
export const SEAL_THRESHOLD = 0.2;

/** Talismans a new onmyōji starts with, so the first catch is reachable by clicking. */
export const STARTING_OFUDA = 3;

/**
 * How many kills at the current depth an 御札 is worth.
 *
 * Price is derived from the depth's own gold reward rather than given a second growth
 * curve of its own. That keeps a talisman the same number of kills forever, which is
 * the one number worth holding steady: it is the lever the whole restraint economy
 * balances on, and a curve that drifts from the gold curve would quietly break it.
 */
export const OFUDA_KILLS = 5;

/** Life at or below which the yōkai can be sealed. */
export const sealThresholdFor = (maxLife: number): number =>
    Math.max(1, Math.floor(maxLife * SEAL_THRESHOLD));

/** Whether a yōkai at this life is weak enough to seal. A dead one is not sealable. */
export const isSealable = (life: number, maxLife: number): boolean =>
    life > 0 && life <= sealThresholdFor(maxLife);

export const ofudaCost = (depth: number): number =>
    Math.max(1, Math.round(scaleStats(clampDepth(depth)).goldReward * OFUDA_KILLS));
