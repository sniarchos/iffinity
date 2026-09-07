---
title: Structure of an `iffinity` story
layout: default
permalink: /story/
nav_order: 3
---

# {{ page.title }}

* TOC
{:toc}

Heavily inspired by [Twine](https://twinery.org/) and its [Snowman](https://videlais.github.io/snowman/#/) story format, every iffinity Story is made out of **Snippets** (the same as Twine's passages, but "snippets" sounds more minimal).

For some examples of iffinity projects, see the [examples folder](https://github.com/sniarchos/iffinity/tree/HEAD/examples).

## Project structure

An iffinity project is a *directory* in your file system. In this directory, you can organize your story in one or more files, spread out in any number of subdirectories you want.

The iffinity compiler takes into account only the files with `.html`, `.htm` and `.ejs` extensions, anywhere under the project root directory; it parses these files, and compiles the snippets it finds into an output HTML.

## File structure

Each file in an iffinity project is essentially an HTML file. In each such file, the author can define one or more snippets.

## Snippet structure

A snippet is nothing more than an HTML tag with the following structure:

```html
<snippet name="A Snippet" tags="TAG1 TAG2" scripts="a-script.js" styles="a-style.css" start>
...
</snippet>
```

An exhaustive list of all possible snippet attributes follows:
 - `name`: The name of the snippet. Must be unique throughout the story. This attribute is **required** for every snippet.
 - `tags`: A list of space-separated tags for the snippet. See the [tags]({{ site.baseurl }}/tags/) page for more information. This attribute is not required.
 - `scripts`: A list of **semicolon-separated** JavaScript files that will run every time the snippet is shown. The scripts will run **in the order the are listed**, and also **inside the same EJS scope**. This attribute is not required.
 - `styles`: A list of **semicolon-separated** CSS files to be applied on this snippet. The styles will be applied **in the order the are listed**. This attribute is not required.
 - `start`: This attribute indicates that the snippet is **the entry point** of the story (i.e., the first "page" the player will see). In every story, **exactly one snippet must have this attribute**.

For more information on the `scripts` and `styles` attribute, see the [relevant page]({{ site.baseurl }}/scripts-styles/).

The content of the snippet is plain-old HTML, where the author can also inject JavaScript code via the [EJS template engine]({{ site.baseurl }}/ejs/).

### Snippet links

Once again inspired by Twine/Snowman, apart from plain-old HTML, iffinity offers 3 types of links to navigate between snippets:

#### 1. Simple snippet links

The iffinity compiler replaces all `[[<snippet name>]]` occurrences with a link to that snippet, for example:

```
The man enters the [[Castle]].
```

By clicking on the link, the player will navigate to the snippet named "Castle".

#### 2. Masked snippet links

The iffinity compiler replaces all `[[<custom text>|<snippet name>]]` (note the `|` character) occurrences with a link to that snippet, but with a custom text instead. For example:

```
The man [[walks through the door|Castle]].
```

By clicking on the link "walks through the door", the player will navigate to the snippet named "Castle".

#### 3. Custom links

The iffinity compiler replaces all `[[<custom text>||<id and classes>]]` (note the double `|`) occurrences with a **dead** link. This means that nothing will happen by default. Why would someone want this? Well, here is an example:

```
Do you wish to proceed to the next room [[with your sword||#sword.proceed]] or [[leave it behind||#no-sword.proceed]]?
```

These links will be replaced by `<a>` tags by the compiler (which also happens with the 2 previous types). However, the first will have `id="sword"`, the second one will have `id="no-sword"`, while both of them will have `class="proceed"`. By organizing your links this way, you could then write some simple [code in the snippet]({{ site.baseurl }}/ejs/) to introduce a state change:

```js
<%
   $(function() {  // never forget that when accessing the DOM!
       $(".proceed").on("click", function() {
           s.SWORD = $(this).attr('id') === "sword";
           story.showSnippet('Next Room');
       });
   });
%>
```

This way, the player will navigate to the "Next Room" snippet regardless, but the `s.SWORD` variable will be `true` or `false`, depending on what they clicked. This is a powerful mechanism to simplify the structure of your snippets and introduce state changes without messing with your snippet organization. Note, however, that these are **dead links**. This means that it is **your responsibility** to change the snippet (if so desired), via the `showSnippet()` method of the `story` variable. See the [author API page]({{ site.baseurl }}/author-api/) for more information.

### HTML shorthands

Inspired by [Twine/Snowman](https://videlais.github.io/snowman/#/2/learning/markup) once again, iffinity supports the following HTML shorthands, which can be appended (in any combination/order) immediately after the tag name of an HTML element:
- `#my-id`: Sets the ID of the element to `my-id`
- `.my-class`: Sets the class of the element to `my-class` (multiple ones will result in the element having multiple classes)

For example, the following:

```html
<div#my-id.my-class-1.my-class-2 ...other attributes...>
    ...
</div>
```

will be compiled to this:

```html
<div id="my-id" class="my-class-1 my-class-2" ...other attributes...>
    ...
</div>
```

Note that it is not disallowed to use multiple IDs, but only the first one will be used.

### The `<iff-link>` tag

Sometimes, snippet transitions happen via code (i.e., using the `story.showSnippet` method) instead of snippet links. For better organization and for proper parsing of the story from the `ifc show --graph` command, the author can use the `<iff-link>` HTML tag to explicitly state that there is a (conditional) transition from the current snippet to another one via code. This HTML element is not rendered in browser; it's meant to be used solely for organization purposes. Example:

```ejs
<snippet name="Snippet A">
    ...
    <% if (SOME_CONDITION) story.showSnippet("Snippet B") %>

    <iff-link>Snippet B</iff-link>
    ...
</snippet>
```

## Output file structure

The output HTML has the following general structure:

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <title></title>
    </head>
    <body>
        <div id="iff-story">
            <div id="iff-snippet"></div>
        </div>
    </body>
</html>
```

Every time the shown snippet changes, the contents of `#iff-snippet` are purged and replaced by the new snippet. Nothing else is touched by the engine. The author, however, can do what they please. For example, they can add stuff to `#iff-story` via jQuery in their story script(s) that will stay there forever (or until the author's scripts remove them at some point).
