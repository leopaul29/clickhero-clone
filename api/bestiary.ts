import Anthropic from "@anthropic-ai/sdk";
import {zodOutputFormat} from "@anthropic-ai/sdk/helpers/zod";
import {MONSTERS} from "../src/data/monsters.ts";
import {YOKAI_POOL} from "../src/data/yokai.ts";
import {
    BestiarySchema, buildUserPrompt, parseDepths, selectValidMonsters, SYSTEM_PROMPT,
} from "./_lib/bestiary-prompt.ts";

/**
 * Serverless proxy for the generated bestiary.
 *
 * It exists for one reason: the API key must never reach the browser. A key in
 * client JavaScript ships to every player in the bundle.
 *
 * Deploy alongside the static site (Vercel, Netlify Functions v2, Cloudflare
 * Workers — all take this Web-standard handler) with ANTHROPIC_API_KEY set in the
 * platform's environment. The game is fully playable without it: the client treats
 * every failure here as "use the procedural bestiary".
 */

const MODEL = "claude-opus-5";

/** Names the model should not hand back, so the bestiary keeps expanding. */
const AVOID = [...MONSTERS.map(m => m.name), ...YOKAI_POOL.map(y => y.name)];

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: {"Content-Type": "application/json", "Cache-Control": "no-store"},
    });

export default async function handler(request: Request): Promise<Response> {
    if (request.method !== "POST") return json({error: "Method not allowed"}, 405);

    if (!process.env.ANTHROPIC_API_KEY) {
        // Not an error worth shouting about: an unconfigured deployment simply has
        // no generated bestiary, and the client falls back on its own.
        return json({monsters: [], reason: "not_configured"}, 503);
    }

    let depths: number[];
    try {
        depths = parseDepths(await request.json());
    } catch {
        return json({error: "Invalid JSON body"}, 400);
    }

    if (depths.length === 0) return json({error: "No valid depths requested"}, 400);

    try {
        const client = new Anthropic();

        const response = await client.messages.parse({
            model: MODEL,
            max_tokens: 2_000,
            system: SYSTEM_PROMPT,
            messages: [{role: "user", content: buildUserPrompt(depths, AVOID)}],
            output_config: {format: zodOutputFormat(BestiarySchema)},
        });

        // A policy decline is a normal outcome here, not a crash: the client is
        // already built to fall back to the procedural bestiary.
        if (response.stop_reason === "refusal") {
            return json({monsters: [], reason: "refused"}, 200);
        }

        return json({monsters: selectValidMonsters(response.parsed_output, depths)});
    } catch (error) {
        console.error("Bestiary generation failed:", error);
        return json({monsters: [], reason: "upstream_error"}, 502);
    }
}
