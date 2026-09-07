---
title: Scripts & Styles
layout: default
permalink: /scripts-styles/
nav_order: 7
---

# {{ page.title }}

* TOC
{:toc}

On of the greatest strengths of the iffinity engine is that it allows the author to organize their scripts and styles however they desire, using the configuration file.

iffinity features a hierarchical system to organize the code of a project. There are 4 levels/types of scripts/styles. With the exception of the libraries, all other levels have access to the [author API]({{ site.baseurl }}/author-api/), as well as to jQuery and EJS. Higher to lower, these levels are the following:

## The library scripts/stylesheets

These files are defined in the `libraries.{scripts,styles}` fields of the configuration file. They are JS/CSS files that are appended to the `<head>` of the output HTML. They have no access to the [author API]({{ site.baseurl }}/author-api/). These can be external libraries (like jQuery) or custom user libraries.

## The story scripts/stylesheets

These are JS/CSS script files that are defined in the `{scripts,styles}.story` fields of the configuration file. The JS scripts **run once at the beginning of the story** (i.e., when the player initially loads the game on their browser). Also, **they run before all scripts of lower levels**. This is the place for initializing the story's state, and for registering [snippet lifecycle event handlers]({{ site.baseurl }}/author-api/#snippet-lifecycle-events) &mdash; register those here rather than in global code, which would re-bind them on every snippet. The stylesheets define the default style of the whole story (can be overridden by stylesheets of subsequent levels, of course).

## The global scripts

These are JS script files that are defined in the `scripts.global` field of the configuration file. These JS scripts **run every time a snippet is shown**. Note that they also **runs before all scripts of lower levels**. This is the place to add some dynamic content/logic that is common across the whole story - a header/footer, for example, or the display logic of an inventory system. In other words, everything that can't be made by scripts that run only once at the beginning (i.e., the story scripts) and needs to create/manage content/logic in a dynamic, snippet-specific way, this is the place to do it. Note that there is no CSS counterpart; it wouldn't make a lot of sense.

## Tag-specific scripts/stylesheets

These files are defined in the `{scripts,styles}.tags` fields of the configuration file. They are JS/CSS files that are associated with a specific tag rule. Each entry of the `{scripts,styles}.tags` arrays is an object with 2 fields, a tag rule (`{scripts,styles}.tags[i].rule`) and some associated scripts (`{scripts,styles}.tags[i].files`). Only the snippets whose tags satisfy the tag rule will have those files. For more information, see the page on iffinity's [tag system]({{ site.baseurl }}/tags/). Not that the tag-specific scripts **run before any snippet-specific scripts** and that the tag-specific stylesheets **override any styles of higher levels**.

## Snippet-specific scripts/stylesheets

These files are **not defined in the configuration file**; instead, they are defined as attributes of a snippet and are specific to it:

```html
<snippet name="A Snippet" scripts="script1.js; script2.js" styles="style1.css; style2.css; style3.css">
    ...
</snippet>
```

Note that:
 - the files are **semicolon-separated** (spaces before/after the `;` are ignored).
 - the scripts run and the stylesheets are applied **in order**.
 - the snippet-specific scripts run **after all scripts of higher levels** and the snippet-specific styles **override any styles of higher levels**.
 - if the file paths are not absolute, then they are resolved first relative to the snippet directory and then (if that fails) relative to the project root.

Maybe you have a snippet that is a highly stylized, logic-heavy minigame? Snippet-specific scripts/stylesheets are the way to go.

## Injected scripts

These are code segments injected in the snippet via the EJS template system. For more information, see the [relevant page]({{ site.baseurl }}/ejs/).
