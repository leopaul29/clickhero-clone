import type {Monster, Bonus} from '../types/game';

export const MONSTERS: Monster[] = [
    { id: 1, name: 'Rototo', life: 10, gold: 1 },
    { id: 2, name: 'Putipito', life: 25, gold: 3 },
    { id: 3, name: 'Bigboss', life: 50, gold: 8 },
];

export const BONUSES: Bonus[] = [
    { name: "clickPower", description: "Add click power", power: 5, level: 0, cost: 10 },
    { name: "dpsPower", description: "Add DPS power", power: 3, level: 0, cost: 50 }
];