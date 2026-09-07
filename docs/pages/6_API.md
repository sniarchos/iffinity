---
title: The Author API
layout: default
permalink: /author-api/
nav_order: 6
---

# {{ page.title }}

* TOC
{:toc}

iffinity exposes an API to the author's JavaScript code, both inside EJS segments, as well as to the [story, global and snippet scripts]({{ site.baseurl }}/scripts-styles/).

As explained previously, any code you write inside EJS tags has access to the following variables created by iffinity:

 - `story`: The [story object]({{ site.baseurl }}/author-api/#the-story-object)
 - `snippet`: The current [snippet object]({{ site.baseurl }}/author-api/#the-snippet-object)
 - `s`: The story state object (a pseudo-variable; shorthand for the `story.state` field)
 - `f`: The story functions object (a pseudo-variable; shorthand for the `story.funcs` field)

This is how you can, for example, change the story state:

```ejs
<% s.TIMES_DIED++ %>
```

or programmatically change the current snippet:

```ejs
<% story.showSnippet("Another Snippet") %>
```

Note that the only way to have variables/computations etc escape a certain EJS segment and live on is to store them in the story state `s`. For functions, `f` is recommended instead, because the `save()` method (see below) serializes `s` and functions won't survive that.

## The `story` object

The `story` object is the heart of your game. It contains the following useful fields (among others):

 - `title`,
 - `author.name` and `author.email`,
 - `version`,
 - `snippets`: A list with all of the story's snippets (as snippet objects, see next section)
 - `history`: A list of the IDs of all snippets visited by the player so far, in order
 - `state`: An arbitrary object that aims to serve as the story's state. Can also be accessed by the shorthand `s`.
 - `funcs`: An arbitrary object that aims to serve as a way to define custom functions that have access to the author API. Can also be accessed by the shorthand `f`.

It also contains the following methods:

|method name|arguments|description|
|---|---|---|
|`getSnippet(id)`|The name of a snippet|Returns the requested snippet object or undefined if none exists with this ID.|
|`renderSnippet(id)`|The name of a snippet|Renders the snippet with the given id, returning the rendered HTML as a string.|
|`showSnippet(id, addToHistory = true)`|The name of a snippet, and whether to add the snippet to the history|Changes the snippet currently shown on screen, and returns true if the snippet was found and shown, false otherwise.|
|`onLeave(fn)`|A function taking no arguments|Registers a cleanup to run when the current snippet is left. Handlers fire once, just before the snippet's DOM is replaced, and are then discarded. This is where a snippet should stop anything it started &mdash; timers above all.|
|`save()`||Returns a JSON object containing 3 keys: `state`, `history` and `checkpoint`. The idea is for the author to use this JSON to save the game (maybe in the browser's local storage or prompt the user to download a file containing it).|
|`load(data, cb?, landingSnippet?, loadNoHistory = true)`|`data` is what a previous call to `save()` produced, `cb` is a callback that is called right after restoring the state's story, history and checkpoint, receiving the (restored) `story.state` as its sole argument and returning `void`, `landingSnippet` (if provided) is the name of the snippet to show after a successful load instead of the last snippet in the (restored) history (e.g. a "Load Successful" kind of snippet), and `loadNoHistory` dictates whether the snippet that will be shown after a successful load will be added to the story's history|Attempts to load the story using the `data` argument, which should be exactly what `save()` produced. Returns nothing.|
|`createCheckpoint()`||Caches the current state and history as a checkpoint, so that the author/user can return to it. A subsequent call to `createCheckpoint()` overwrites the previously stored checkpoint.|
|`restoreCheckpoint(restoreHistory = false, jumpToCheckpoint = true, addToHistory = true)`|`restoreHistory` dictates whether the story's history should be restored (or just the state), `jumpToCheckpoint` controls whether to go to the snippet where the checkpoint was created or to stay at the current snippet, and `addToHistory` dictates whether the snippet that will be shown after restoring the checkpoint will be added to the story's history. Returns `true` if a checkpoint existed and was restored, and `false` if there was no checkpoint. ||

## Inspecting a story from the browser console

The running story is also available as `window.story`, so you can poke at a story while
developing it without adding temporary snippets:

```js
story.state                    // everything in `s`
story.history                  // snippet IDs visited so far
story.snippets.map(s => s.name)
story.showSnippet("Chapter 3") // jump straight to a scene
```

This is a development convenience. Inside snippet code you already have `story`, `snippet`,
`s` and `f` in scope &mdash; use those rather than reaching through `window`.

## Snippet lifecycle events

The engine fires two events on `window` around every snippet change. Both are
passed the snippet object concerned:

|event|when|argument|
|---|---|---|
|`iff:snippet:leaving`|just before the outgoing snippet's DOM is replaced|the snippet being left, or `undefined` for the very first snippet of the story|
|`iff:snippet:shown`|right after the incoming snippet has been rendered|the snippet now on screen|

```js
$(window).on("iff:snippet:shown", function (event, snippet) {
    window.scrollTo(0, 0);
    console.log("now showing", snippet.name);
});
```

Register these in a [story script]({{ site.baseurl }}/scripts-styles/), which
runs once, rather than in global code, which runs on every snippet.

## Cleaning up after a snippet

A snippet that starts a timer owns that timer. Nothing stops it when the player
navigates away, so it keeps firing against DOM nodes that no longer exist.
`story.onLeave()` is the fix:

```ejs
<%
    $(function () {
        const timer = setInterval(tick, 200);
        story.onLeave(function () {
            clearInterval(timer);
        });
    });
%>
```

Handlers registered this way run exactly once, when the snippet is left, and
are then cleared &mdash; so each visit to the snippet registers afresh. See the
[lifecycle example](https://github.com/sniarchos/iffinity/tree/HEAD/examples/lifecycle),
which demonstrates both the events and `onLeave`, and checks at runtime that
the timer really stopped.

## The `snippet` object

Along with the `story` variable, your code has access to the current `snippet` object. Also, remember that the `story` object holds a list `snippets` of all the story's snippets, which are also stored as snippet objects.

A snippet object contains the following fields:

 - `id`: An internally defined numerical ID for the snippet. The author shouldn't be bothered by it.
 - `name`,
 - `start`: A boolean field that is `true` for exactly one snippet through the story: the first snippet shown to the player when your story is loaded on a browser.
 - `tags`: A list of strings; the tags of the snippet.
 - `source`: The snippet's source code (HTML), as a string, *before* rendering (EJS and snippet link substitution).

Snippet objects do not contain methods (for now).
