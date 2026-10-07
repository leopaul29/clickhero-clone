# clickhero-clone

Guidance for AI agents working in this repository. Created 2026-09-18.

## The gate

`npm run verify` is the definition of done. It runs the same checks locally, in the
pre-push hook, and in CI, so "green on my machine" and "green in CI" cannot drift apart.

**Never report work as complete without having run it and seen it pass.** A change that
type-checks is not a change that works.

## Verifying your own claims

These rules exist because they were learned the expensive way. They are not optional.

- **Grep the literal acceptance criterion.** To check whether a task is done, search the
  code for the exact thing the task named. Do not re-read your own diff narrative — it
  describes what you intended, not what landed.
- **A doc is not evidence.** Any status, roadmap, or audit file in this repo is a snapshot
  that rots. Before acting on a claim it makes, verify it against the code and `git log`.
- **Tracing means tracing.** If you report something as unused, follow it to its call
  sites first. A grep with a `head` limit shows where you stopped reading, not absence.
- **Run the app for anything user-reachable.** Type checks and unit tests verify code
  correctness, never that a user can reach the screen.

## Scope

- Do not widen the change beyond what was asked. If you find a second problem, say so;
  do not fix it uninvited.
- Do not add a dependency without saying why in the commit message.
- Do not disable, skip, or delete a test to get green.

## Commits

`<scope>: <imperative summary>` — e.g. `auth: reject expired refresh tokens`.
One concern per commit.

## Releasing

The ship gate lives in `SCOPE.md`. A release happens when every box is checked, not when
the code feels done. Then:

1. Bump the version in `package.json`
2. Commit
3. `git tag -a vX.Y.Z -m "vX.Y.Z — <summary>"` and push the tag

`release.yml` re-runs the gate and refuses to publish if the tag and `package.json`
disagree. Never tag a WIP or docs commit.
