import test from "node:test";
import assert from "node:assert/strict";

import { evaluateTagRule } from "../src/backend/utils/tags";

test("tag rules: single tags", async (t) => {
    await t.test("matches a present tag", () => {
        assert.equal(evaluateTagRule("A", "A B"), true);
    });

    await t.test("does not match an absent tag", () => {
        assert.equal(evaluateTagRule("C", "A B"), false);
    });

    await t.test("an empty tag list matches nothing", () => {
        assert.equal(evaluateTagRule("A", ""), false);
    });
});

test("tag rules: operators", async (t) => {
    await t.test("&&", () => {
        assert.equal(evaluateTagRule("A && B", "A B"), true);
        assert.equal(evaluateTagRule("A && B", "A"), false);
    });

    await t.test("||", () => {
        assert.equal(evaluateTagRule("A || B", "B"), true);
        assert.equal(evaluateTagRule("A || B", "C"), false);
    });

    await t.test("negation", () => {
        assert.equal(evaluateTagRule("!A", "B"), true);
        assert.equal(evaluateTagRule("!A", "A"), false);
    });

    await t.test("negation binds tighter than &&", () => {
        // (!A) && B, not !(A && B)
        assert.equal(evaluateTagRule("!A && B", "B"), true);
        assert.equal(evaluateTagRule("!A && B", "A B"), false);
    });
});

test("tag rules: precedence and grouping", async (t) => {
    await t.test("&& binds tighter than ||", () => {
        // (A && B) || C
        assert.equal(evaluateTagRule("A && B || C", "C"), true);
        assert.equal(evaluateTagRule("A && B || C", "A"), false);
        assert.equal(evaluateTagRule("A && B || C", "A B"), true);
    });

    await t.test("parentheses override precedence", () => {
        assert.equal(evaluateTagRule("A && (B || C)", "A C"), true);
        assert.equal(evaluateTagRule("A && (B || C)", "A"), false);
    });

    await t.test("negated group", () => {
        assert.equal(evaluateTagRule("!(A && B)", "A"), true);
        assert.equal(evaluateTagRule("!(A && B)", "A B"), false);
    });

    await t.test("grouped operands on both sides", () => {
        assert.equal(evaluateTagRule("(A || B) && (C || D)", "A D"), true);
        assert.equal(evaluateTagRule("(A || B) && (C || D)", "A B"), false);
    });
});

test("tag rules: The Ship's real rules", async (t) => {
    // the tags actually used by The Ship, as a sanity check on realistic input
    await t.test("!VARS selects narrative snippets", () => {
        assert.equal(evaluateTagRule("!VARS", "NO_INV"), true);
        assert.equal(evaluateTagRule("!VARS", "VARS"), false);
    });

    await t.test("LIGHT && !CHOICE", () => {
        assert.equal(evaluateTagRule("LIGHT && !CHOICE", "NO_INV LIGHT"), true);
        assert.equal(
            evaluateTagRule("LIGHT && !CHOICE", "NO_INV LIGHT CHOICE"),
            false
        );
    });
});

test("tag rules: malformed input throws", async (t) => {
    const bad = ["A &&", "&& A", "A B", "A && || B", "(A", "A)", "A && (|| B)"];
    for (const rule of bad) {
        await t.test(`rejects ${JSON.stringify(rule)}`, () => {
            assert.throws(() => evaluateTagRule(rule, "A B"));
        });
    }

    await t.test("rejects an invalid tag in the tag list", () => {
        assert.throws(() => evaluateTagRule("A", "A 1BAD"));
    });
});
