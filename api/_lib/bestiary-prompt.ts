import {z} from "zod";

/** Flavour only — every stat is computed by the game from the depth. */
export const MonsterFlavorSchema = z.object({
    depth: z.number().int().positive(),
    name: z.string().min(1).max(40),
    nameJp: z.string().min(1).max(20),
    emoji: z.string().min(1).max(8),
    description: z.string().min(1).max(60),
});

export const BestiarySchema = z.object({
    monsters: z.array(MonsterFlavorSchema),
});

export type GeneratedFlavor = z.infer<typeof MonsterFlavorSchema>;

/** Depths per request, mirroring BATCH_SIZE on the client. */
export const MAX_DEPTHS_PER_REQUEST = 5;

export const SYSTEM_PROMPT = [
    "You invent yōkai for a Japanese-themed idle game where the player descends ever deeper.",
    "You write flavour only: a name, a Japanese name, one emoji, and a one-line description.",
    "You never decide how much health or gold a creature has — the game computes that from the depth.",
    "Draw on real Japanese folklore where you can, and invent in the same spirit when you cannot.",
    "Greater depth means a more ominous, more storied creature.",
].join(" ");

/** Reject junk before it reaches the model, and keep one request bounded. */
export function parseDepths(input: unknown): number[] {
    const raw = (input as {depths?: unknown})?.depths;
    if (!Array.isArray(raw)) return [];

    const depths = raw
        .filter((d): d is number => typeof d === 'number' && Number.isFinite(d))
        .map(d => Math.floor(d))
        .filter(d => d >= 1 && d <= 10_000);

    return [...new Set(depths)].sort((a, b) => a - b).slice(0, MAX_DEPTHS_PER_REQUEST);
}

export function buildUserPrompt(depths: number[], avoid: string[] = []): string {
    const lines = [
        `Invent one creature for each of these depths: ${depths.join(", ")}.`,
        "",
        "For each one give:",
        "- name: the romanised or English name (e.g. \"Yuki-onna\")",
        "- nameJp: the Japanese name in kana or kanji (e.g. \"雪女\")",
        "- emoji: exactly one emoji that suits it",
        "- description: at most eight words, no final period",
        "",
        "Return one entry per requested depth, each carrying its own depth.",
    ];

    if (avoid.length > 0) {
        lines.push("", `Do not reuse these names: ${avoid.join(", ")}.`);
    }

    return lines.join("\n");
}

/**
 * Keep only entries the caller actually asked for and that pass the schema.
 * A model is untrusted input like any other: it can return a depth nobody
 * requested, a duplicate, or a 900-character "one-line" description.
 */
export function selectValidMonsters(parsed: unknown, requested: number[]): GeneratedFlavor[] {
    const monsters = (parsed as {monsters?: unknown})?.monsters;
    if (!Array.isArray(monsters)) return [];

    const wanted = new Set(requested);
    const seen = new Set<number>();
    const valid: GeneratedFlavor[] = [];

    // Validated one entry at a time rather than as a whole array: a single
    // malformed creature should cost that one depth, not the rest of the batch.
    for (const entry of monsters) {
        const result = MonsterFlavorSchema.safeParse(entry);
        if (!result.success) continue;

        const monster = result.data;
        if (!wanted.has(monster.depth) || seen.has(monster.depth)) continue;

        seen.add(monster.depth);
        valid.push(monster);
    }

    return valid;
}
