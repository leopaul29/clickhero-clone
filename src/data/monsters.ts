import type {Monster, Bonus} from '../types/game';

export const MONSTERS: Monster[] = [
    { id: 1, name: "Kappa", nameJp: "河童", life: 15, maxLife: 15, goldReward: 3, emoji: "🐸", description: "River spirit" },
    { id: 2, name: "Tengu", nameJp: "天狗", life: 35, maxLife: 35, goldReward: 8, emoji: "👺", description: "Mountain's demon" },
    { id: 3, name: "Oni", nameJp: "鬼", life: 60, maxLife: 60, goldReward: 15, emoji: "👹", description: "Fearsome Ogre" },
    { id: 4, name: "Kitsune", nameJp: "九尾狐", life: 100, maxLife: 100, goldReward: 25, emoji: "🦊", description: "Nine-tailed fox" },
    { id: 5, name: "Dragon", nameJp: "竜", life: 250, maxLife: 250, goldReward: 40, emoji: "🐲", description: "Spiritual dragon" },
];
// create one monster who is a chest with a lot of life and a lot of gold that randomly appears every 1% of time

export const BONUSES: Bonus[] = [
    { id: 1, name: "Katana Power", nameJp: "刀の力", description: "Increases attack power by ", effect: "power", power: 5, level: 0, cost: 15, icon: "⚔️" },
    { id: 2, name: "Chi Energy", nameJp: "気のエネルギー", description: "Increases automatic damage per second by ", effect: "dps", power: 3, level: 0, cost: 40, icon: "🌊" },
    { id: 3, name: "Lucky Charm", nameJp: "幸運のお守り", description: "Increases rewards by ", effect: "goldMultiplier", power: 2, level: 0, cost: 100, icon: "🎋" },
];
// create a bonus that clicks 5 times per second automaticaly during 30 sec
