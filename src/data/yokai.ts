import type {MonsterFlavor} from '../types/game.ts';

/**
 * Local fallback bestiary.
 *
 * The generated bestiary is a bonus, never a dependency: with no API key, no
 * network, or a refused request, the game still descends forever using this pool.
 * Anything here is picked deterministically from the depth, so two players at the
 * same depth meet the same creature and a test can assert on it.
 */
export const YOKAI_POOL: MonsterFlavor[] = [
    {name: "Yuki-onna", nameJp: "雪女", emoji: "❄️", description: "Snow woman of the blizzard"},
    {name: "Rokurokubi", nameJp: "ろくろ首", emoji: "👤", description: "Her neck stretches at night"},
    {name: "Nurarihyon", nameJp: "ぬらりひょん", emoji: "👴", description: "Supreme commander of yōkai"},
    {name: "Kamaitachi", nameJp: "鎌鼬", emoji: "🌪️", description: "Sickle weasel riding the wind"},
    {name: "Umibozu", nameJp: "海坊主", emoji: "🌊", description: "Shadow that capsizes ships"},
    {name: "Tsuchigumo", nameJp: "土蜘蛛", emoji: "🕷️", description: "Earth spider of the old hills"},
    {name: "Nue", nameJp: "鵺", emoji: "🌑", description: "Chimera that brings black clouds"},
    {name: "Jorogumo", nameJp: "絡新婦", emoji: "🕸️", description: "The binding bride"},
    {name: "Raiju", nameJp: "雷獣", emoji: "⚡", description: "Thunder beast that falls with lightning"},
    {name: "Kirin", nameJp: "麒麟", emoji: "🦌", description: "Omen of a just ruler"},
    {name: "Baku", nameJp: "獏", emoji: "🌙", description: "Devourer of nightmares"},
    {name: "Shinigami", nameJp: "死神", emoji: "💀", description: "Guide to the far shore"},
];

/** Applied each time the pool is exhausted, so a second lap is not a repeat. */
export const RANKS: Array<{ prefix: string; prefixJp: string }> = [
    {prefix: "", prefixJp: ""},
    {prefix: "Elder", prefixJp: "古の"},
    {prefix: "Awakened", prefixJp: "覚醒した"},
    {prefix: "Calamity", prefixJp: "災いの"},
    {prefix: "Abyssal", prefixJp: "深淵の"},
];
