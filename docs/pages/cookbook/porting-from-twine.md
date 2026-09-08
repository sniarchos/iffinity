---
title: Porting a story from Twine/Snowman
layout: default
parent: Cookbook
permalink: /cookbook/porting-from-twine/
nav_order: 1
---

# {{ page.title }}

* TOC
{:toc}

iffinity is close enough to [Snowman](https://videlais.github.io/snowman/#/) that most of a story moves across mechanically, and different enough in a few specific places that the mechanical parts will bite you if you are not expecting them. This page is the list of places it bites.

It is written from a real port: a 229-passage story with three minigames, a save system and a persistent UI. Everything below is something that actually went wrong, or something that would have if it had not been caught.

## Get the passages out first

Twine stores your story as a single archive. Before anything else, split it into one file per passage, and record each passage's name, tags and body length somewhere you can check against later.

That list is what lets you answer "did I move everything?" at the end, which is otherwise surprisingly hard to be sure of. Counting passages in, counting snippets out, and comparing the prose of each pair catches the passage you silently dropped.

You do not need to keep the extracted files afterwards. You do need them while you work.

## The four things that break quietly

These are the changes that produce a story which compiles, loads, and is subtly wrong.

### 1. Snowman renders Markdown. iffinity does not.

Snowman and its forks run your passage text through a Markdown renderer. iffinity does not, by design: a snippet is HTML, and whatever you type is what the browser gets. So `**Ben**` renders as four asterisks and a name.

This means Markdown has to be converted to HTML **once, at the source level**, as part of the port:

```
**bold**            ->   <strong>bold</strong>
*emphasis*          ->   <em>emphasis</em>
# A Heading         ->   <h1>A Heading</h1>
- a list item       ->   <ul><li>a list item</li></ul>
```

**The trap.** You will be tempted to do this with a regex over each passage. Fine, but your passages contain code as well as prose, and `*` means something very different in code. This line:

```js
const msInHour = 1000 * 60 * 60;
```

becomes this, silently, and the snippet no longer compiles:

```js
const msInHour = 1000 <em> 60 </em> 60;
```

Before running any regex over a passage, lift out the regions that are not prose (both `<% ... %>` blocks **and** `<script> ... </script>` blocks) substitute a placeholder, transform what remains, then put them back. Missing the `<script>` half is easy to do and produces exactly the failure above.

Since iffinity 1.0.0 the compiler will catch this for you: every snippet and script is compiled at build time and a failure names the file, the line and the problematic code. Before that version it would have reached the player as a blank screen, most likely.

### 2. `<%= %>` means the opposite thing

Snowman templates with Underscore, iffinity with [EJS]({{ site.baseurl }}/ejs/). Both spell interpolation `<%= %>`, and they disagree about what it does:

| | Underscore (Snowman) | EJS (iffinity) |
|---|---|---|
| `<%= x %>` | raw | **HTML-escaped** |
| `<%- x %>` | escaped | **raw** |

So every interpolation in your story needs `<%=` changed to `<%-`, or your prose comes out with visible `&lt;strong&gt;` and `&amp;` all through it. Keep `<%=` only where you genuinely want escaping (eg, interpolating something the player typed).

### 3. Helpers on the state object do not survive a save

In Snowman there is one bag, `story.state`, and authors tend to hang helper functions on it. But state gets serialized to save the game, and functions do not survive `JSON.stringify`. A usual workaround is a restore callback that re-attaches every helper by hand after every load:

```js
// Snowman: needed after every restore, and easy to forget to update
function restoreCB(s) {
    s.say = window.setup.say;
    s.think = window.setup.think;
    // ...one line per helper, forever
    s.SESSION_STARTED_AT = new Date();
}
story.restore(hash, restoreCB, "Load");
```

iffinity splits the bag in two. `s` is your state and is serialized; `f` is your functions and is not. Define helpers on `f` in your [story script]({{ site.baseurl }}/scripts-styles/) and the whole problem disappears:

```js
// iffinity: f is rebuilt from your story script on every page load
f.say = function (person, text) {
    return (
        '<p class="say say-' + person + '"><strong>' +
        s.NAME_TRANS[person] +
        '</strong>: "' + text + '"</p>'
    );
};
```

```js
story.load(
    data,
    function (state) {
        state.SESSION_STARTED_AT = Date.now();
    },
    "Load"
);
```

The restore callback survives only for genuine state fixups, like restarting a clock.

### 4. Timers outlive the snippet that started them

Neither engine stops a `setInterval` you started in a passage. In Snowman there is nothing to hand the cleanup to, so a typing-animation timer keeps firing against DOM nodes that no longer exist after the player navigates away.

iffinity gives you a teardown hook. Register it next to the timer:

```js
const interval = setInterval(tick, 1000);
story.onLeave(function () {
    clearInterval(interval);
});
```

Handlers run once, just before the snippet's DOM is replaced, and are then discarded. The [lifecycle example]({{ site.baseurl }}/examples/) proves it at runtime: a snippet starts a timer, hands over the cleanup, and the next snippet checks whether it really stopped.

## The mechanical renames

These are noisy but safe; a search and replace, then read the diff.

| Snowman | iffinity |
|---|---|
| `story.show(x)` | `story.showSnippet(x)` |
| `story.render(x)` | `story.renderSnippet(x)` |
| `story.state` | `s` |
| `passage` | `snippet` |
| `passage.tags`, `passage.name` | `snippet.tags`, `snippet.name` |
| `window.setup.foo` | `f.foo` |

One difference worth calling out: `renderSnippet` returns a string and, since 1.0.0, does **not** run that snippet's scripts unless you pass `true` as a second argument. `showSnippet` always runs them, because that is a real visit. See the [author API]({{ site.baseurl }}/author-api/).

## Things Snowman gave you that iffinity does not

Snowman bundles Underscore and a handful of globals. iffinity bundles jQuery and EJS, and nothing else, by design. Anything below that your story uses, you write yourself :) each is a few lines in your story script, on `f`:

```js
/** Snowman's either(): pick one at random. */
f.either = function (...args) {
    const pool = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
    return pool[Math.floor(Math.random() * pool.length)];
};

/** Snowman's hasVisited(), by snippet name. */
f.hasVisited = function (name) {
    const snip = story.getSnippet(name);
    return snip !== undefined && story.history.includes(snip.id);
};

/** Snowman's renderToSelector(). */
f.renderToSelector = function (selector, snippetName) {
    $(selector).html(story.renderSnippet(snippetName));
};
```

If you used a couple of Underscore functions, port those the same way rather than adding the dependency back.

## Link and markup shorthands

Simple and masked links are the same as Twine's, so `[[Castle]]` and `[[walk through the door|Castle]]` need no change.

Snowman's `<a0#id.class>text</a>` (ie, a link that goes nowhere and is wired up in code) becomes iffinity's third link form:

```
<a0#sword.proceed>with your sword</a>     ->     [[with your sword||#sword.proceed]]
```

Both produce an `<a>` with that id and class and no destination; it is your code's job to call `showSnippet` (or to hook up any other logic). See [custom links]({{ site.baseurl }}/story/#3-custom-links).

If your story used an invisible `<div class="editor">` full of `[[...]]` to make Twine's map draw arrows for code-driven transitions, that becomes [`<iff-link>`]({{ site.baseurl }}/story/#the-iff-link-tag), one per destination. It is a compile-time declaration: `ifc show --graph` and the link checker see it, and it is stripped from the output, so your code cannot read anything back out of it at runtime.

## Whitespace, and the paragraphs you will lose

This one is easy to miss because nothing breaks: the story compiles, loads and plays, and the prose is simply wrong.

Markdown turned your blank lines into `<p>` elements. With Markdown gone, a blank line between two paragraphs is just whitespace, and they run together into a single block. The port this page is written from lost **219 paragraph breaks across 85 of its 217 snippets** before anyone noticed, because the snippets that got looked at early were the ones where a `say()` helper was already emitting `<p>` tags.

One CSS rule brings them back:

```css
#iff-snippet {
    white-space: pre-line;
}
```

Use `pre-line` rather than `pre-wrap`. Both keep your newlines, but `pre-line` also collapses runs of spaces, so indented markup inside a snippet does not drag its indentation onto the screen.

**Then check your conditionals.** With newlines now meaningful, a line break in the *source* becomes a line break on screen; including the ones you only put there to keep an `<% if %>` readable:

```ejs
Directly opposite the desk lay the door, leading outside
<% if (s.ADDRESSED_CREW) { %>[[to the main deck|Main Deck]].
```

That renders the sentence across two lines. Where the newline comes *after* the tag, EJS can swallow it with `-%>`:

```ejs
... to the ship's <% if (s.CHAPTER > "3") { -%>
[[bridge|Bridge]].
```

Where it comes *before* the tag, as in the first example, there is nothing to slurp (EJS's `<%_` strips spaces and tabs but not the preceding newline) so join the two lines by hand.

Grep for a prose line followed directly by a line starting with `<%` and check each one. There will not be many, and they are obvious on screen once you know to look.

## Checking you moved everything

Three passes, in this order, each of which catches a different kind of mistake.

**Coverage.** Every passage in your extracted list should appear exactly once as a snippet. Compare the two name lists in both directions; the interesting direction is the one you did not think to check.

**Prose.** For each pair, strip the code and the markup from both sides and compare what is left. It should differ only where Markdown became HTML. This catches the paragraph lost to a bad regex, which coverage cannot see because the snippet is still there.

**Compilation.** Run `ifc`. It will tell you that every snippet and script compiles, that every link resolves, and that snippet names appearing as string literals in your code point at snippets that exist:

```
All snippet links resolve
All 220 template(s) compile
```

That last check is worth a moment. A typo in `story.showSnippet("Brdige")` used to be found by clicking it; now the compiler says so. It is a warning rather than an error, because the reference may sit on a branch that never runs.

None of this replaces playing the thing. It does mean that when you play it, you are looking for storytelling problems rather than for the passage you dropped in chapter four.

## While you are in there

A port is a rare chance to delete something. Two patterns worth reconsidering rather than translating:

**Passage-name dispatch.** If your Twine story has a long `if` chain over `passage.name` to decide which chrome to draw, that is what [tag rules]({{ site.baseurl }}/tags/) are for. A rule like `!VARS` attaches a script to every snippet that is not tagged `VARS`, and the engine does the dispatch.

**DOM surgery for layout.** Cloning a passage's rendered output and hiding the parts that do not match is a Twine habit born of having nowhere else to put layout. In iffinity you have a stylesheet per tag. One story replaced a hundred lines of clone-and-hide, which arranged three speakers into three columns, with a CSS grid and a class name emitted by its `say()` helper.
