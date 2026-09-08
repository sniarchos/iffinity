---
title: The configuation file
layout: default
permalink: /config/
nav_order: 4
---

# {{ page.title }}

* TOC
{:toc}

As mentioned before, every iffinity project is defined by a configuration file.

By default, `ifc init` creates an `iff-config.json` file in the project's root directory, populating it with only the most basic info. Here is an overview of all possible fields that this JSON file can have (this is its actual type definition in TypeScript):

```typescript
type StringOrStringArray = string | string[];

type TagRule = {
    rule: string;
    files: StringOrStringArray;
};

type Config = {
    story: {
        title: string;
        author: {
            name: string;
            email?: string;
        };
        version: string;
        repository?: { type: string; url: string };
    };

    libraries?: {
        scripts?: StringOrStringArray;
        styles?: StringOrStringArray;
    };

    scripts?: {
        story?: StringOrStringArray;
        global?: StringOrStringArray;
        tags?: TagRule[];
    };

    styles?: {
        story?: StringOrStringArray;
        tags?: TagRule[];
    };

    validation?: Record<string, any>;
};
```

Every field that has an `?` after its name means that it is optional. All other fields are required. Also, wherever paths are referred to, they should be either absolute or relative to the project's root directory.

Every field that has a type of `StringOrStringArray` can either be a single file (e.g. `scripts.story = "story.js"`) or a list of files (e.g. `scripts.story = ["story1.js", "story2.js"]`. The following apply to all fields of the `StringOrStringArray` type:
1. They are applied **in order**. This means that a JS script will run after all the previous in the same list have run, and that a CSS stylesheet will override all properties defined in previous stylesheets in the same list (that it also defines).
2. For JS scripts: They run **in the same EJS scope** (except for the library scripts, see below), so subsequent scripts in a list have access to variables/functions etc defined in the previous scripts of the same list. This facilitates the author to further break down their logic in smaller parts if they see fit, without having to always use the story state `s` for [intra-level]({{ site.baseurl }}/scripts-styles/) script communication.

A breakdown of all configuration fields follows:

 - `story`: This is the most important field. It contains all the information about the story itself.
   - `title`: The title of the story.
   - `author`: The author of the story.
     - `name`: The name of the author.
     - `email`: The email of the author. This field is optional.
   - `version`: The version of the story.
   - `repository`: The repository of the story. This field is optional.
     - `type`: The type of the repository (e.g. `git`)
     - `url`: The URL of the repository.
 - `libraries`: This field contains the paths to the libraries that the story uses. These are scripts that will be added to the `head` tag of the output HTML. Note that these scripts **have no access to the [author API]({{ site.baseurl }}/author-api/)**.
   - `scripts`: The paths to the JavaScript libraries.
   - `styles`: The paths to the CSS libraries.
 - `scripts`: This field contains the paths to the scripts that the story uses.
   - `story`: The path(s) to the [story script(s)]({{ site.baseurl }}/scripts-styles/#the-story-scriptsstylesheets).
   - `global`: The path(s) to the [global script(s)]({{ site.baseurl }}/scripts-styles/#the-global-scripts).
   - `tags`: A list of tag rules and the associated paths to the scripts that they correspond to. See the page about [the tag system]({{ site.baseurl }}/tags/) for more information.
 - `styles`: This field contains the paths to the stylesheets that the story uses.
   - `story`: The path(s) to the [story stylesheet(s)]({{ site.baseurl }}/scripts-styles/#the-story-scriptsstylesheets).
   - `tags`: A list of tag rules and the associated paths to the stylesheets that they correspond to. See the page about [the tag system]({{ site.baseurl }}/tags/) for more information.
 - `validation`: See the following section.

## Source HTML validation

From version 0.4.0 onward, `iffinity` uses the [html-validate](https://html-validate.org/) package to validate the source HTML of a story. More specifically, `iffinity` uses the `html-validate:recommended` rule set, as well as the following rules:

```typescript
const valrules: Record<string, any> = {
    "element-name": ["error", { whitelist: ["snippet"] }],
    "void-style": "off",        // for self-closing tags
    "no-raw-characters": "off", // for ejs tags
    "no-inline-style": "off",   // too restrictive
};
```

The author can use the `validation` field of the configuration file to add any rule they want from the [list of rules supported by html-validate](https://html-validate.org/rules/). For example, if you want to make sure that you do not use any `<style>` tags in your code, you can add the following rule (which is not part of the recommended -i.e., the default- rule set):

```
...
"validation": {
    ...
    "no-style-tag": "error",
    ...
}
...
```

You can also modify the default `iffinity` rules. For example, if you want to make sure you do not use any inline styling in your code, you can change/override the default rule above by writing the following in the `validation` field:

```
...
"validation": {
    ...
    "no-inline-style": "error",
    ...
}
...
```

If you are more interested in properly validating your source code, make sure to browse the [html-validate rule reference](https://html-validate.org/rules/) and tweak the validation rules to your liking.

## Examples

This is an example of the simplest possible configuration file:

```json
{
    "story": {
        "title": "An Example Story",
        "author": {
            "name": "Me"
        },
        "version": "1.0.0"
    }
}
```

And this is the configuration file of the [convoluted example](https://github.com/sniarchos/iffinity/blob/HEAD/examples/convoluted/iff-config.json):

```json
{
    "story": {
        "title": "Three Snippets",
        "author": {
            "name": "Sotiris Niarchos"
        },
        "version": "1.0.0"
    },
    "scripts": {
        "story": "scripts/story.js",
        "global": "scripts/global.js",
        "tags": [
            {
                "rule": "THE_WILD",
                "files": "scripts/the-wild.js"
            },
            {
                "rule": "CASTLE",
                "files": "scripts/castle.js"
            },
            {
                "rule": "THE_WILD && CASTLE",
                "files": "scripts/the-wild-and-castle.js"
            }
        ]
    },
    "styles": {
        "story": "styles/story.css",
        "tags": [
            {
                "rule": "THE_WILD",
                "files": "styles/the-wild.css"
            }
        ]
    }
}
```

## The `strictLinks` option

Every time it compiles, iffinity checks that each snippet link points at a snippet that
actually exists, and reports the ones that do not:

```
Warning: 2 link(s) point to snippets that do not exist:
  The Vault <- linked from Corridor, Stairwell
  Epilogue  <- linked from Chapter 7
```

Links whose target is computed at render time (e.g. `[[Continue|<%- dest %>]]`) cannot be
checked and are skipped; the summary line says how many were skipped.

By default a broken link is a warning, so a half-written story still compiles. Set
`strictLinks` to `true` to make it an error that aborts the build &mdash; useful in CI:

```json
{
    "strictLinks": true
}
```


## The `exclude` option

Every `.html`, `.htm` and `.ejs` file under the project root is part of the story. That is
usually what you want, and occasionally exactly what you don't: drafts, notes and scratch
files kept next to the sources get compiled in alongside them, and a duplicated `start`
attribute in a forgotten draft will stop the build with a confusing error.

`exclude` lists paths the compiler should not read, relative to the project root:

```json
{
    "exclude": ["drafts", "notes/**", "**/*.scratch.ejs"]
}
```

Three wildcards are available: `?` matches one character, `*` matches any run of characters
within a single path segment, and `**` matches across segments. Naming a directory excludes
everything beneath it, so `drafts` is enough to drop `drafts/act-one.ejs`.

`node_modules`, `.git`, `dist`, `.test-build` and `.vscode` are always skipped and need not
be listed.

## Compile-time template checking

A snippet is compiled by the engine only when the player first reaches it, which used to
mean that a syntax error in a rarely-visited snippet survived the whole build and showed up
as a blank screen mid-playthrough. An error in the story code was worse: it took the first
snippet down with it, so the story would not start at all.

Every snippet, and every story, global and tag/snippet script, is now compiled at build
time. Nothing is written unless all of them succeed:

```
All 220 template(s) compile
```

and a failure names the file, the line and the offending code:

```
Error: 1 of 220 template(s) do not compile:
  in script scripts/astronav.js, line 3:
    Invalid regular expression: missing / while compiling ejs
    1 | $(function () {
    2 |     const a = 1;
    3 >     ctx.moveTo(0.2 <em> W, 0.8 </em> H);
    4 | });
```

For a snippet the line is counted from the snippet's own first line, not the enclosing
file's, since a file may hold many snippets.

This check is not optional: a story that cannot compile cannot be played, so there is
nothing to trade off. It catches only *syntax* errors &mdash; code that runs but throws is
still a runtime matter.

## Snippet names used in code

The link check above reads markup, so a transition written in code goes unseen unless you
also declare it with [`<iff-link>`]({{ site.baseurl }}/story/#the-iff-link-tag) &mdash; easy
to forget, and easier still to let drift once a snippet is renamed. Snippet names that
appear as string literals in your code are therefore checked too:

```
Warning: 1 code reference(s) name snippets that do not exist:
  Brdige <- named in Bridge Approach
```

Only literals can be checked. `story.showSnippet(destination)` is a runtime decision, and so
is `story.showSnippet("Inventory/" + item)`, where the literal is only a prefix; neither is
flagged. This stays a warning even under `strictLinks`, since the reference may sit on a
branch that never runs.
