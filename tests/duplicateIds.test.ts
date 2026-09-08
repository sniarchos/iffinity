import { test, describe } from "node:test";
import assert from "node:assert";
import * as cheerio from "cheerio";
import { findDuplicateIds } from "../src/backend/utils/checks";

/** Build the cheerio view of a story the way the compiler does. */
function snippets(source: string) {
    const $ = cheerio.load(source);
    return [$("snippet"), $] as const;
}

function dupsIn(source: string) {
    const [userSnippets, $] = snippets(source);
    return findDuplicateIds(userSnippets, $);
}

describe("duplicate ids: what is legitimate", () => {
    test("two snippets may reuse an id", () => {
        // only one snippet is ever in the document
        const found = dupsIn(
            '<snippet name="A"><div id="rest">1</div></snippet>' +
                '<snippet name="B"><div id="rest">2</div></snippet>'
        );
        assert.deepStrictEqual(found, []);
    });

    test("many snippets may reuse the same id", () => {
        const source = ["A", "B", "C", "D"]
            .map((n) => `<snippet name="${n}"><p id="x">${n}</p></snippet>`)
            .join("");
        assert.deepStrictEqual(dupsIn(source), []);
    });

    test("distinct ids inside one snippet", () => {
        const found = dupsIn(
            '<snippet name="A"><div id="one"></div><div id="two"></div></snippet>'
        );
        assert.deepStrictEqual(found, []);
    });

    test("no ids at all", () => {
        assert.deepStrictEqual(
            dupsIn('<snippet name="A"><p>hi</p></snippet>'),
            []
        );
    });

    test("an empty id attribute is not an id", () => {
        const found = dupsIn(
            '<snippet name="A"><div id=""></div><div id=""></div></snippet>'
        );
        assert.deepStrictEqual(found, []);
    });
});

describe("duplicate ids: what is a bug", () => {
    test("the same id twice inside one snippet", () => {
        const found = dupsIn(
            '<snippet name="Start"><div id="rest">1</div><p id="rest">2</p></snippet>'
        );
        assert.strictEqual(found.length, 1);
        assert.strictEqual(found[0].snippet, "Start");
        assert.deepStrictEqual(found[0].ids, [["rest", 2]]);
    });

    test("counts every repeat, not just the second", () => {
        const found = dupsIn(
            '<snippet name="A"><i id="x"></i><i id="x"></i><i id="x"></i></snippet>'
        );
        assert.deepStrictEqual(found[0].ids, [["x", 3]]);
    });

    test("several duplicated ids in one snippet are all reported", () => {
        const found = dupsIn(
            '<snippet name="A">' +
                '<i id="x"></i><i id="x"></i>' +
                '<b id="y"></b><b id="y"></b>' +
                "</snippet>"
        );
        assert.deepStrictEqual(found[0].ids, [
            ["x", 2],
            ["y", 2],
        ]);
    });

    test("each offending snippet gets its own entry", () => {
        const found = dupsIn(
            '<snippet name="A"><i id="x"></i><i id="x"></i></snippet>' +
                '<snippet name="B"><p>fine</p></snippet>' +
                '<snippet name="C"><i id="z"></i><i id="z"></i></snippet>'
        );
        assert.deepStrictEqual(
            found.map((f) => f.snippet),
            ["A", "C"]
        );
    });

    test("nesting does not hide a duplicate", () => {
        const found = dupsIn(
            '<snippet name="A"><div id="x"><span><i id="x"></i></span></div></snippet>'
        );
        assert.deepStrictEqual(found[0].ids, [["x", 2]]);
    });
});
