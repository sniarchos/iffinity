import test from "node:test";
import assert from "node:assert/strict";

import {
    compileAuthoringSyntax,
    resetCodeStash,
    unmaskCode,
} from "../src/backend/utils/crawler";

/**
 * The crawler masks author code, rewrites the authoring shorthands, and the
 * compiler unmasks on the way out. Tests go through the same round trip so
 * they assert on what actually lands in the output file.
 */
function compile(src: string): string {
    resetCodeStash();
    return unmaskCode(compileAuthoringSyntax(src));
}

test("snippet links", async (t) => {
    await t.test(
        "[[Name]] links to the snippet and uses it as the text",
        () => {
            assert.equal(
                compile("[[Vault]]"),
                '<a href="javascript:void(0)" data-snippet="Vault">Vault</a>'
            );
        }
    );

    await t.test("[[text|Name]] separates label from target", () => {
        assert.equal(
            compile("[[go in|Vault]]"),
            '<a href="javascript:void(0)" data-snippet="Vault">go in</a>'
        );
    });

    await t.test("[[text||#id.class]] makes a plain anchor", () => {
        const out = compile("[[roll||#roll-btn.dice]]");
        assert.match(out, /id="roll-btn"/);
        assert.match(out, /class="dice"/);
        assert.doesNotMatch(out, /data-snippet/);
    });

    await t.test("newlines inside a link are collapsed", () => {
        assert.equal(
            compile("[[go\n   in|Vault]]"),
            '<a href="javascript:void(0)" data-snippet="Vault">go in</a>'
        );
    });
});

test("id/class shorthands", async (t) => {
    await t.test("<div#id> expands", () => {
        assert.match(compile("<div#desc>x</div>"), /<div id="desc">/);
    });

    await t.test("<div.a.b> expands to both classes", () => {
        assert.match(compile("<div.a.b>x</div>"), /class="a b"/);
    });

    await t.test("a tag with neither is left alone", () => {
        assert.equal(compile("<div>x</div>"), "<div>x</div>");
    });
});

/**
 * Regression tests for the class of bug where the rewrites ran over raw source
 * and silently corrupted the author's JavaScript.
 */
test("author code is never rewritten", async (t) => {
    await t.test("i<arr.length is not turned into a tag", () => {
        const out = compile("<% for (let i=0;i<arr.length;i++) {} %>");
        assert.doesNotMatch(out, /class="length"/);
        assert.match(out, /i&lt;arr\.length/);
    });

    await t.test("x<y.z survives", () => {
        assert.doesNotMatch(compile("<% if (x<y.z) f(); %>"), /class="z"/);
    });

    await t.test("arr[[i]] is not turned into a link", () => {
        const out = compile("<% const v = arr[[i]]; %>");
        assert.doesNotMatch(out, /data-snippet/);
        assert.match(out, /arr\[\[i\]\]/);
    });

    await t.test("[[...]] inside a JS string stays a string", () => {
        const out = compile('<% const t = "[[not a link]]"; %>');
        assert.doesNotMatch(out, /data-snippet/);
        assert.match(out, /\[\[not a link\]\]/);
    });

    await t.test("nested destructuring survives", () => {
        const out = compile("<% const [[a,b],[c,d]] = pairs; %>");
        assert.doesNotMatch(out, /data-snippet/);
    });

    await t.test("<script> bodies are protected too", () => {
        const out = compile("<script>for(let i=0;i<a.length;i++){}</script>");
        assert.doesNotMatch(out, /class="length"/);
    });

    await t.test(
        "code is escaped so an HTML parser cannot restructure it",
        () => {
            const out = compile("<% if (a<b) {} %>");
            assert.match(out, /&lt;%/);
            assert.match(out, /a&lt;b/);
        }
    );
});

test("links and code coexist", async (t) => {
    await t.test("a link between code blocks still compiles", () => {
        const out = compile("<% if (ok) { %>[[Vault]]<% } %>");
        assert.match(out, /data-snippet="Vault"/);
        assert.match(out, /&lt;% if \(ok\) \{ %&gt;/);
    });

    await t.test("a link target may be interpolated at render time", () => {
        const out = compile("[[Continue|<%- dest %>]]");
        assert.match(out, /data-snippet="&lt;%- dest %&gt;"/);
    });

    await t.test("multiple masked regions are restored in order", () => {
        const out = compile("<% one(); %>A<% two(); %>B<% three(); %>");
        assert.match(out, /one\(\);.*A.*two\(\);.*B.*three\(\);/s);
    });
});
