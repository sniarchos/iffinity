import { test, describe } from "node:test";
import assert from "node:assert";
import path from "path";
import { Excluder, IGNORED_DIRS } from "../src/backend/utils/ignore";

const ROOT = path.resolve("/project");
const abs = (p: string) => path.join(ROOT, ...p.split("/"));

describe("Excluder: always-ignored directories", () => {
    for (const dir of IGNORED_DIRS) {
        test(`skips ${dir} even with no patterns`, () => {
            const ex = new Excluder(ROOT);
            assert.strictEqual(ex.excludesDir(abs(dir)), true);
            assert.strictEqual(ex.excludesDir(abs(`sub/${dir}`)), true);
        });
    }

    test("does not skip an ordinary directory", () => {
        const ex = new Excluder(ROOT);
        assert.strictEqual(ex.excludesDir(abs("snippets")), false);
        assert.strictEqual(ex.excludesFile(abs("snippets/ch1.ejs")), false);
    });

    test("reports having no patterns of its own", () => {
        assert.strictEqual(new Excluder(ROOT).isEmpty, true);
        assert.strictEqual(new Excluder(ROOT, ["x"]).isEmpty, false);
    });
});

describe("Excluder: naming a directory excludes what is under it", () => {
    const ex = new Excluder(ROOT, ["drafts"]);

    test("the directory itself", () => {
        assert.strictEqual(ex.excludesDir(abs("drafts")), true);
    });

    test("a file directly inside it", () => {
        assert.strictEqual(ex.excludesFile(abs("drafts/wip.ejs")), true);
    });

    test("a file nested deeper inside it", () => {
        assert.strictEqual(ex.excludesFile(abs("drafts/act1/one.ejs")), true);
    });

    test("but not a sibling with a longer name", () => {
        assert.strictEqual(ex.excludesFile(abs("drafts-final/a.ejs")), false);
    });

    test("and not the same name deeper in the tree", () => {
        // the pattern is anchored at the project root
        assert.strictEqual(ex.excludesFile(abs("act1/drafts/a.ejs")), false);
    });
});

describe("Excluder: wildcards", () => {
    test("* stays within one path segment", () => {
        const ex = new Excluder(ROOT, ["notes/*.ejs"]);
        assert.strictEqual(ex.excludesFile(abs("notes/a.ejs")), true);
        assert.strictEqual(ex.excludesFile(abs("notes/deep/a.ejs")), false);
        assert.strictEqual(ex.excludesFile(abs("notes/a.html")), false);
    });

    test("** crosses path segments", () => {
        const ex = new Excluder(ROOT, ["**/scratch.ejs"]);
        assert.strictEqual(ex.excludesFile(abs("a/scratch.ejs")), true);
        assert.strictEqual(ex.excludesFile(abs("a/b/c/scratch.ejs")), true);
    });

    test("? matches exactly one character", () => {
        const ex = new Excluder(ROOT, ["v?.ejs"]);
        assert.strictEqual(ex.excludesFile(abs("v1.ejs")), true);
        assert.strictEqual(ex.excludesFile(abs("v12.ejs")), false);
    });

    test("a dot is literal, not any-character", () => {
        const ex = new Excluder(ROOT, ["a.ejs"]);
        assert.strictEqual(ex.excludesFile(abs("a.ejs")), true);
        assert.strictEqual(ex.excludesFile(abs("axejs")), false);
    });
});

describe("Excluder: pattern normalisation", () => {
    test("accepts backslashes, ./ prefixes and trailing slashes", () => {
        for (const pattern of ["drafts", "./drafts", "drafts/", "drafts\\"]) {
            const ex = new Excluder(ROOT, [pattern]);
            assert.strictEqual(
                ex.excludesFile(abs("drafts/wip.ejs")),
                true,
                `pattern ${JSON.stringify(pattern)} should exclude drafts/`
            );
        }
    });

    test("ignores blank patterns", () => {
        const ex = new Excluder(ROOT, ["", "   "]);
        assert.strictEqual(ex.isEmpty, true);
        assert.strictEqual(ex.excludesFile(abs("a.ejs")), false);
    });

    test("never excludes the project root itself", () => {
        const ex = new Excluder(ROOT, ["**"]);
        assert.strictEqual(ex.excludesDir(ROOT), false);
    });

    test("does not reach outside the project root", () => {
        const ex = new Excluder(ROOT, ["**"]);
        assert.strictEqual(
            ex.excludesFile(path.resolve(ROOT, "..", "outside.ejs")),
            false
        );
    });
});
