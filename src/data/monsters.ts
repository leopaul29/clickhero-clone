import type {HandcraftedMonster, Bonus} from '../types/game';

/** The opening act. Depth is the index + 1; past this the bestiary is generated. */
export const MONSTERS: HandcraftedMonster[] = [
    { name: "Kappa", nameJp: "河童", life: 15, goldReward: 3, emoji: "🐸", description: "River spirit" },
    { name: "Tengu", nameJp: "天狗", life: 35, goldReward: 8, emoji: "👺", description: "Mountain's demon" },
    { name: "Oni", nameJp: "鬼", life: 60, goldReward: 15, emoji: "👹", description: "Fearsome Ogre" },
    { name: "Kitsune", nameJp: "九尾狐", life: 100, goldReward: 25, emoji: "🦊", description: "Nine-tailed fox" },
    { name: "Dragon", nameJp: "竜", life: 250, goldReward: 40, emoji: "🐲", description: "Spiritual dragon" },
];
// create one monster who is a chest with a lot of life and a lot of gold that randomly appears every 1% of time

/**
 * Ids are save keys, so they are never reused or renumbered.
 *
 * Id 2 was Chi Energy, a flat "+3 automatic damage". It is gone: automatic damage is
 * the shikigami collection now, and a bought number sitting beside a shelf of bound
 * spirits that each deal damage would be two answers to the same question.
 */
export const BONUSES: Bonus[] = [
    { id: 1, name: "Katana Power", nameJp: "刀の力", description: "Increases attack power by ", effect: "power", power: 5, level: 0, cost: 15, icon: "⚔️" },
    { id: 3, name: "Lucky Charm", nameJp: "幸運のお守り", description: "Increases rewards by ", effect: "goldMultiplier", power: 2, level: 0, cost: 100, icon: "🎋" },
];
// create a bonus that clicks 5 times per second automaticaly during 30 sec
