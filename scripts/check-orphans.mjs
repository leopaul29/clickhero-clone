// Fails when a module under src/ is not reachable from an entry point.
//
// This repo shipped two complete localStorage implementations, neither of them
// wired to anything, and nobody noticed for a year: a green build says nothing
// about whether a file is used. This walks the import graph from main.tsx and
// every test file, and fails on anything it cannot reach.
//
// Self-check: node scripts/check-orphans.mjs --self-check
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {dirname, join, relative, resolve} from 'node:path';

const SRC = resolve('src');
const CODE = /\.tsx?$/;
const IS_TEST = /\.test\.tsx?$/;
const DECLARATION = /\.d\.ts$/;

/** Entry points: what a bundler or the test runner starts from. */
const ENTRIES = ['src/main.tsx'];

function walk(dir) {
    return readdirSync(dir).flatMap((name) => {
        const full = join(dir, name);
        return statSync(full).isDirectory() ? walk(full) : [full];
    });
}

/** Resolve a relative import the way the bundler does, extension optional. */
function resolveImport(fromFile, specifier) {
    const base = resolve(dirname(fromFile), specifier);
    const candidates = [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')];

    return candidates.find((candidate) => {
        try {
            return statSync(candidate).isFile() && CODE.test(candidate);
        } catch {
            return false;
        }
    });
}

function importsOf(file) {
    const source = readFileSync(file, 'utf8');
    const specifiers = [...source.matchAll(/(?:from\s*|import\s*\(?\s*)['"](\.[^'"]+)['"]/g)].map((m) => m[1]);

    return specifiers.map((s) => resolveImport(file, s)).filter(Boolean);
}

export function findOrphans() {
    const all = walk(SRC).filter((f) => CODE.test(f) && !DECLARATION.test(f));
    const entries = [...ENTRIES.map((e) => resolve(e)), ...all.filter((f) => IS_TEST.test(f))];

    const reached = new Set();
    const queue = entries.filter((e) => all.includes(e));

    while (queue.length > 0) {
        const file = queue.pop();
        if (reached.has(file)) continue;
        reached.add(file);
        queue.push(...importsOf(file));
    }

    return all.filter((f) => !reached.has(f)).map((f) => relative(process.cwd(), f));
}

if (process.argv.includes('--self-check')) {
    // The gate must be seen failing before it is trusted (VERIFY.md).
    const {mkdirSync, writeFileSync, rmSync} = await import('node:fs');
    const decoy = join(SRC, '__orphan_self_check__.ts');
    mkdirSync(SRC, {recursive: true});
    writeFileSync(decoy, 'export const unused = 1;\n');
    const found = findOrphans();
    rmSync(decoy);

    const caught = found.some((f) => f.includes('__orphan_self_check__'));
    console.log(caught
        ? 'self-check: PASS — a deliberately orphaned module was detected'
        : 'self-check: FAIL — the check did not notice an orphaned module');
    process.exit(caught ? 0 : 1);
}

const orphans = findOrphans();

if (orphans.length > 0) {
    console.error('Unreachable modules (not imported from main.tsx or any test):\n');
    for (const file of orphans) console.error(`  ${file}`);
    console.error('\nWire them up or delete them. Dead code that type-checks is still dead.');
    process.exit(1);
}

console.log('check:orphans — every module under src/ is reachable');
