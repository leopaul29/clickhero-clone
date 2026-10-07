import {describe, expect, it} from 'vitest';
import {
    buildUserPrompt, MAX_DEPTHS_PER_REQUEST, parseDepths, selectValidMonsters, SYSTEM_PROMPT,
} from './bestiary-prompt.ts';

const flavor = (depth: number, over: Record<string, unknown> = {}) => ({
    depth, name: 'Yuki-onna', nameJp: '雪女', emoji: '❄️', description: 'Snow woman', ...over,
});

describe('parseDepths', () => {
    it('accepts a clean list', () => {
        expect(parseDepths({depths: [6, 7, 8]})).toEqual([6, 7, 8]);
    });

    it.each([
        ['a missing body', undefined],
        ['a missing field', {}],
        ['a non-array', {depths: 'all of them'}],
        ['an empty list', {depths: []}],
    ])('returns nothing for %s', (_label, input) => {
        expect(parseDepths(input)).toEqual([]);
    });

    it('drops values that are not usable depths', () => {
        expect(parseDepths({depths: [6, -1, 0, 'x', null, Number.NaN, Infinity, 7]})).toEqual([6, 7]);
    });

    it('de-duplicates and sorts', () => {
        expect(parseDepths({depths: [9, 6, 9, 7]})).toEqual([6, 7, 9]);
    });

    // An unbounded list is an unbounded bill, from an endpoint anyone can POST to.
    it('caps one request at a single batch', () => {
        const huge = Array.from({length: 500}, (_, i) => i + 6);
        expect(parseDepths({depths: huge})).toHaveLength(MAX_DEPTHS_PER_REQUEST);
    });

    it('refuses an absurd depth', () => {
        expect(parseDepths({depths: [10_001, 1e9]})).toEqual([]);
    });
});

describe('buildUserPrompt', () => {
    it('names every requested depth', () => {
        const prompt = buildUserPrompt([6, 7, 8]);
        expect(prompt).toContain('6, 7, 8');
    });

    it('passes on the names to avoid', () => {
        expect(buildUserPrompt([6], ['Kappa', 'Tengu'])).toContain('Kappa, Tengu');
    });

    it('omits the avoid line when there is nothing to avoid', () => {
        expect(buildUserPrompt([6])).not.toContain('Do not reuse');
    });

    it('asks for the four flavour fields and nothing about stats', () => {
        const prompt = buildUserPrompt([6]);
        for (const field of ['name', 'nameJp', 'emoji', 'description']) {
            expect(prompt).toContain(field);
        }
        expect(prompt.toLowerCase()).not.toContain('health');
        expect(prompt.toLowerCase()).not.toContain('gold');
    });

    it('tells the model in the system prompt that stats are not its business', () => {
        expect(SYSTEM_PROMPT).toContain('never decide');
    });
});

describe('selectValidMonsters', () => {
    it('keeps well-formed entries for requested depths', () => {
        expect(selectValidMonsters({monsters: [flavor(6), flavor(7)]}, [6, 7])).toHaveLength(2);
    });

    // Model output is untrusted input like any other.
    it('drops a depth that was never requested', () => {
        expect(selectValidMonsters({monsters: [flavor(99)]}, [6])).toEqual([]);
    });

    it('drops a duplicate depth, keeping the first', () => {
        const picked = selectValidMonsters({monsters: [flavor(6, {name: 'First'}), flavor(6, {name: 'Second'})]}, [6]);
        expect(picked).toHaveLength(1);
        expect(picked[0].name).toBe('First');
    });

    it('drops an entry with an empty field', () => {
        expect(selectValidMonsters({monsters: [flavor(6, {nameJp: ''})]}, [6])).toEqual([]);
    });

    it('drops an over-long "one-line" description', () => {
        expect(selectValidMonsters({monsters: [flavor(6, {description: 'x'.repeat(500)})]}, [6])).toEqual([]);
    });

    it('drops a non-integer depth', () => {
        expect(selectValidMonsters({monsters: [flavor(6.5)]}, [6])).toEqual([]);
    });

    it.each([
        ['null', null],
        ['a missing parse', undefined],
        ['the wrong shape', {creatures: []}],
        ['a non-array', {monsters: 'nope'}],
    ])('returns nothing for %s', (_label, input) => {
        expect(selectValidMonsters(input, [6])).toEqual([]);
    });

    // One malformed creature should cost that depth, not the whole round trip.
    it('keeps the good entries from a partly broken batch', () => {
        const picked = selectValidMonsters({monsters: [flavor(6), {depth: 7, name: 'Half'}, flavor(8)]}, [6, 7, 8]);
        expect(picked.map(m => m.depth)).toEqual([6, 8]);
    });
});
