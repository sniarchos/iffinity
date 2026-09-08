import { test, describe } from "node:test";
import assert from "node:assert";
import { findTemplateFailures, Template } from "../src/backend/utils/checks";

const snippet = (source: string, label = "S"): Template => ({
    label,
    kind: "snippet",
    source,
});

const code = (source: string, label = "code.js"): Template => ({
    label,
    kind: "story code",
    source,
    isCode: true,
});

describe("template check: what should pass", () => {
    test("plain prose", () => {
        assert.deepStrictEqual(
            findTemplateFailures([snippet("Just some words.\n")]),
            []
        );
    });

    test("interpolation and control flow spanning several tags", () => {
        const src = [
            "<% if (s.x) { %>",
            "yes, <%- s.name %>",
            "<% } else { %>",
            "no",
            "<% } %>",
        ].join("\n");
        assert.deepStrictEqual(findTemplateFailures([snippet(src)]), []);
    });

    test("a code file, which the runtime wraps in one tag", () => {
        assert.deepStrictEqual(
            findTemplateFailures([
                code("var a = 1;\nfunction f() { return a; }\n"),
            ]),
            []
        );
    });

    test("comparison chains that merely look like markup", () => {
        // `a < b > c` is legal JavaScript and must not be mistaken for a tag
        assert.deepStrictEqual(
            findTemplateFailures([code("const r = 1 < w > 2;\n")]),
            []
        );
    });

    test("an empty template", () => {
        assert.deepStrictEqual(findTemplateFailures([snippet("")]), []);
    });
});

describe("template check: what should fail, and where", () => {
    test("markdown emphasis where multiplication belonged", () => {
        // exactly the damage a markdown pass does to `1000 * 60 * 60`
        const src = [
            "",
            "Hi there",
            "<%",
            "const msInHour = 1000 <em> 60 </em> 60;",
            "%>",
        ].join("\n");
        const failures = findTemplateFailures([snippet(src)]);
        assert.strictEqual(failures.length, 1);
        assert.strictEqual(failures[0].line, 4);
        assert.match(failures[0].message, /regular expression/i);
    });

    test("a string literal broken across two lines, in story code", () => {
        const src = [
            "var ok = 1;",
            "function boom() {",
            "    alert(",
            '        "Could not load your game :(',
            '  Did you upload the correct file?"',
            "    );",
            "}",
        ].join("\n");
        const failures = findTemplateFailures([code(src)]);
        assert.strictEqual(failures.length, 1);
        // the `<% ` wrapper adds no newline, so this is the author's own line
        assert.strictEqual(failures[0].line, 4);
    });

    test("an unclosed block", () => {
        const failures = findTemplateFailures([snippet("<% if (a) { %>\nx\n")]);
        assert.strictEqual(failures.length, 1);
    });

    test("the failure names the template it came from", () => {
        const failures = findTemplateFailures([
            snippet("fine"),
            snippet("<% ) %>", "Broken"),
            code("var a = 1;"),
        ]);
        assert.strictEqual(failures.length, 1);
        assert.strictEqual(failures[0].template.label, "Broken");
        assert.strictEqual(failures[0].template.kind, "snippet");
    });

    test("every broken template is reported, not just the first", () => {
        const failures = findTemplateFailures([
            snippet("<% ) %>", "A"),
            snippet("ok", "B"),
            snippet("<% ) %>", "C"),
        ]);
        assert.deepStrictEqual(
            failures.map((f) => f.template.label),
            ["A", "C"]
        );
    });

    test("a message is always present, even when the line is not", () => {
        for (const f of findTemplateFailures([snippet("<% ) %>")])) {
            assert.ok(f.message.length > 0);
            assert.ok(!f.message.includes("\n"));
        }
    });
});
