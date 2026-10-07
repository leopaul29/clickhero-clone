# The verify gate

One command, three places. That is the whole idea.

| where | when | what runs |
|---|---|---|
| local | you type it | `npm run verify` |
| pre-push hook | every `git push` | `npm run verify` |
| CI (`ci.yml`) | every push / PR | `npm run verify` |
| release (`release.yml`) | every `v*` tag | `npm run verify` + tag/version agreement |

If the three ever run different things, the gate is worthless — a push can be green
locally and red in CI, and you stop trusting either. Keep them identical.

## Adding a project-specific check

The generic checks (types, lint, tests) catch generic mistakes. The expensive bugs are
project-specific, and a hand-written check catches them for good.

Write a script that exits non-zero, and add it to `verify`:

```
"check:colors": "node scripts/check-colors.mjs",
"verify": "... && npm run check:colors"
```

Good candidates: a design-token rule ("no raw hex outside theme.ts"), i18n key parity
across locales, a dead-code ratchet, a forbidden-import rule between layers.

**Prove the check can fail before trusting it.** Introduce a deliberate violation, watch
it exit non-zero, then remove it. A gate that has only ever been seen passing is
indistinguishable from a gate that cannot fail.
