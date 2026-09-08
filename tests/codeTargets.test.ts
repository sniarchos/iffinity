import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { checkCodeTargets, Template } from "../src/backend/utils/checks";

const code = (source: string, label = "s.js"): Template => ({
    label,
    kind: "script",
    source,
    isCode: true,
});

const defined = (...names: string[]) => new Set(names);

// the check reports to the console; keep the test output readable
const realError = console.error;
beforeEach(() => {
    console.error = () => {};
});
afterEach(() => {
    console.error = realError;
});

describe("code targets: names that resolve", () => {
    test("a snippet that exists", () => {
        const t = code('story.showSnippet("Bridge");');
        assert.strictEqual(checkCodeTargets([t], defined("Bridge")), 0);
    });

    test("either quote style", () => {
        const t = code("story.showSnippet('Bridge');");
        assert.strictEqual(checkCodeTargets([t], defined("Bridge")), 0);
    });

    test("renderSnippet as well as showSnippet", () => {
        const t = code('story.renderSnippet("Options");');
        assert.strictEqual(checkCodeTargets([t], defined("Options")), 0);
    });

    test("a name containing slashes and spaces", () => {
        const t = code('story.showSnippet("Inventory/The Book");');
        assert.strictEqual(
            checkCodeTargets([t], defined("Inventory/The Book")),
            0
        );
    });

    test("whitespace around the argument", () => {
        const t = code('story.showSnippet(  "Bridge"  );');
        assert.strictEqual(checkCodeTargets([t], defined("Bridge")), 0);
    });
});

describe("code targets: names decided at runtime are not flagged", () => {
    test("a bare variable", () => {
        const t = code("story.showSnippet(destination);");
        assert.strictEqual(checkCodeTargets([t], defined()), 0);
    });

    test("a literal used as a prefix", () => {
        // the real name is built by concatenation, so the literal proves nothing
        const t = code('story.showSnippet("Inventory/" + $(this).data("t"));');
        assert.strictEqual(checkCodeTargets([t], defined("Inventory")), 0);
    });

    test("a literal used as a prefix, with odd spacing", () => {
        const t = code('story.showSnippet("Inventory/"\n    + item);');
        assert.strictEqual(checkCodeTargets([t], defined()), 0);
    });

    test("a template literal", () => {
        const t = code("story.showSnippet(`Chapter ${n}`);");
        assert.strictEqual(checkCodeTargets([t], defined()), 0);
    });

    test("an empty string", () => {
        const t = code('story.showSnippet("");');
        assert.strictEqual(checkCodeTargets([t], defined()), 0);
    });
});

describe("code targets: names that do not resolve", () => {
    test("a typo is reported", () => {
        const t = code('story.showSnippet("Brdige");');
        assert.strictEqual(checkCodeTargets([t], defined("Bridge")), 1);
    });

    test("each referencing template counts once", () => {
        const a = code('story.showSnippet("Gone");', "a.js");
        const b = code('story.showSnippet("Gone");', "b.js");
        assert.strictEqual(checkCodeTargets([a, b], defined()), 2);
    });

    test("the same bad name twice in one template counts once", () => {
        const t = code('story.showSnippet("Gone"); story.showSnippet("Gone");');
        assert.strictEqual(checkCodeTargets([t], defined()), 1);
    });

    test("several distinct bad names are all reported", () => {
        const t = code('story.showSnippet("A"); story.renderSnippet("B");');
        assert.strictEqual(checkCodeTargets([t], defined()), 2);
    });

    test("a method of the same name on some other object still counts", () => {
        // there is only one such method in iffinity; a false positive here
        // costs a warning, while missing a real one costs a dead end
        const t = code('thing.showSnippet("Nowhere");');
        assert.strictEqual(checkCodeTargets([t], defined()), 1);
    });

    test("nothing to check means nothing reported", () => {
        assert.strictEqual(checkCodeTargets([], defined()), 0);
        assert.strictEqual(
            checkCodeTargets([code("var a = 1;")], defined()),
            0
        );
    });
});
