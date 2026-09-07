---
title: The tag system
layout: default
permalink: /tags/
nav_order: 8
---

# {{ page.title }}

Another of iffinity's strengths, its tag system enables the author to have a fine-grained control over the way their logic and/or styles are organized across their story.

Every snippet can have 0 or more tags:

```html
<snippet name="A Snippet" tags="TAG1 TAG2 TAG3">
    ....
</snippet>
```

The author can define rules in the configuration file, that bind the snippets that satisfy them to certain scripts and/or styles.

Let's take a look at the configuration file of the [convoluted example](https://github.com/sniarchos/iffinity/tree/HEAD/examples/convoluted):

```javascript
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

Observe the `scripts.tags` and `styles.tags` arrays. There are rules that apply the script `scripts/the-wild.js` to any snippet with the `THE_WILD` tag, the script `scripts/castle.js` to any snippet with the `CASTLE` tag, and the stylesheet `styles/the-wild.css` to any snippet with the `THE_WILD` tag. But there is one more rule in the `scripts.tags` array that applies the script `scripts/the-wild-and-castle.js` to any snippet that has **both** the `THE_WILD` and `CASTLE` tags.

You can create any logical expression of tags in your rules, following the JavaScript syntax and using:
 - parentheses (`(` and `)`),
 - the AND operator (`&&`),
 - the OR operator (`||`), and
 - the NOT operator (`!`).

Note that the standard precedence for logical operators holds, i.e. in the absence of parentheses, NOT is applied before AND, which is applied before OR.
