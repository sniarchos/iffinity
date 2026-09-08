---
title: The command line interface
layout: default
permalink: /cli/
nav_order: 2
---

# {{ page.title }}

* TOC
{:toc}

The author interacts with the iffinity engine via the `ifc` (iffinity compiler) command line tool:

```
$ ifc -h
~~~ The iffinity engine compiler ~~~

Running ifc with no command is equivalent to running ifc compile.

For help and options of a specific command, run:
ifc <command> --help/-h (e.g. ifc show --help)

Usage: ifc [command] [commandOptions]

Commands:
  ifc compile [options]  Compile the project in the given directory to a single
                         HTML file                                     [default]
  ifc watch [options]    Recompile the project whenever a source file changes
  ifc init               Create a new iffinity project in the current directory
  ifc edit [options]     Edit the configuration file of the project
  ifc show [options]     Show several project details
  ifc completion         Generate a shell completion script

Options:
  -p, --projectRoot  The root directory of the project (if not specified, the
                     current directory is used)                         [string]
  -c, --config       Specify a configuration file for your project (default:
                     <projectRoot>/iff-config.json)                     [string]
  -o, --outputFile   The output HTML file path (default: <projectRoot>/<Story
                     Title>.html)                                       [string]
  -t, --testFrom     Test the story from a different snippet than the start
                     snippet                                            [string]
  -v, --version      Show iffinity engine version number               [boolean]
  -h, --help         Show help                                         [boolean]
```

## The `init` command

As explained in the previous page, the `init` command aims to help the author create a stub for their iffinity project. It covers the required fields of the [configuration file]({{ site.baseurl }}/config/) (as well as a bit more), and optionally creates an example game as a template. It is heavily inspired by the behavior of `npm init`. Note that it is preferable to run `ifc init` in a newly created, empty directory.

## The `compile` command

```
$ ifc compile -h
ifc compile [options]

Compile the project in the given directory to a single HTML file

Options:
  -p, --projectRoot  The root directory of the project (if not specified, the
                     current directory is used)                         [string]
  -c, --config       Specify a configuration file for your project (default:
                     <projectRoot>/iff-config.json)                     [string]
  -o, --outputFile   The output HTML file path (default: <projectRoot>/<Story
                     Title>.html)                                       [string]
  -t, --testFrom     Test the story from a different snippet than the start
                     snippet                                            [string]
  -v, --version      Show iffinity engine version number               [boolean]
  -h, --help         Show help                                         [boolean]
```

The default command (i.e. `ifc compile` is the same as `ifc`). It expects to find an iffinity configuration file with the name `iff-config.json` in the current directory (if the `-c` flag is not specified) and attempts to compile the project into a single output HTML. The command's options are pretty self-explanatory from the help message above. An example of running `ifc` on the template project that `ifc init` creates:

```
$ ifc
Config checks
  Story title: test
  Story author name: sotiris
  Story version: 1.0.0
Basic sanity checks
  Found 2 snippet(s) across 1 file(s).
  Found 1 starting snippet(s).
All snippet links resolve
So far so good. Compiling...
All 2 template(s) compile
Rendered game saved to test.html. Enjoy!
```

The output lands **next to the project it was built from**, not in whatever directory you
happened to run the command in, so `ifc compile -p ../some-story` leaves
`../some-story/Some_Story.html` behind rather than dropping it on your desk. An explicit
`--outputFile/-o` is your own path and is used exactly as you typed it, relative to where you
are standing.

Two of those lines are checks that can stop the build. `All snippet links resolve` reports
links pointing at snippets that do not exist &mdash; a warning by default, an error with
[`strictLinks`]({{ site.baseurl }}/config/#the-strictlinks-option). `All N template(s)
compile` reports that every snippet and every script survived `ejs.compile()`; a syntax
error there is always fatal, and nothing is written. Both are described under
[configuration]({{ site.baseurl }}/config/#compile-time-template-checking).

By default every `.html`, `.htm` and `.ejs` file under the project root is compiled into the
story. Use [`exclude`]({{ site.baseurl }}/config/#the-exclude-option) to keep drafts and
scratch files out; `node_modules`, `.git`, `dist`, `.test-build` and `.vscode` are always
skipped.

### Testing from a different snippet

By using the `--testFrom/-t` option, you can instruct `iffinity` to compile your story to an HTML named (by default) `<story name>_from_<testing snippet>.html` where the snippet provided will be the starting snippet instead of the one with the `start` attribute. This facilitates rapid testing of specific snippets without having to change the `start` attribute in your source code every time.

## The `edit` command

```
$ ifc edit [options]

Edit the configuration file of the project

Options:
  -c, --config                  Specify a configuration file for your project
                                (default: <projectRoot>/iff-config.json)[string]
      --title                   Change the title of the story           [string]
      --author-name             Change the name of the story author     [string]
      --author-email            Change the email of the story author    [string]
      --story-version           Change the version of the story         [string]
      --repo                    Change the repository of the story      [string]
      --add-lib-scripts         Append library script(s) to the story    [array]
      --remove-lib-scripts      Remove library script(s) from the story  [array]
      --clear-lib-scripts       Remove all library scripts from the story
                                                                       [boolean]
      --add-lib-styles          Append library style(s) to the story     [array]
      --remove-lib-styles       Remove library style(s) from the story   [array]
      --clear-lib-styles        Remove all library styles from the story
                                                                       [boolean]
      --add-story-scripts       Append story script(s) to the story      [array]
      --remove-story-scripts    Remove story script(s) from the story    [array]
      --clear-story-scripts     Remove all story scripts from the story[boolean]
      --add-story-styles        Append story style(s) to the story       [array]
      --remove-story-styles     Remove story style(s) from the story     [array]
      --clear-story-styles      Remove all story styles from the story [boolean]
      --add-global-scripts      Append global script(s) to the story     [array]
      --remove-global-scripts   Remove global script(s) from the story   [array]
      --clear-global-scripts    Remove all global scripts from the story
                                                                       [boolean]
      --add-script-tag-rule     Add a tag rule to the story, along with the
                                corresponding script(s)                  [array]
      --remove-script-tag-rule  Remove a tag rule from the story, along with the
                                corresponding script                    [string]
      --add-style-tag-rule      Add a tag rule to the story, along with the
                                corresponding style(s)                   [array]
      --remove-style-tag-rule   Remove a tag rule from the story, along with the
                                corresponding style                     [string]
  -v, --version                 Show iffinity engine version number    [boolean]
  -h, --help                    Show help                              [boolean]

Examples:
  ifc edit --story-version 1.1.0
  ifc edit --repo https://github.com/user/repo.git
  ifc edit --add-global-scripts global-vars.js global-logic.js
  ifc edit --add-script-tag-rule 'TAG1 && !TAG2' script1.js script2.js
  ifc edit --remove-style-tag-rule 'TAG1 || TAG2'
```

A utility command to help the author edit the configuration file in an automatic, non-manual way. The help message as well as the examples above are pretty self-explanatory. Note that it is totally OK to edit the configuration file manually.

## The `show` command

```
ifc show -h
ifc show [options]

Show several project details

Options:
  -p, --projectRoot  The root directory of the project                  [string]
  -c, --config       Specify a configuration file for your project (default:
                     <projectRoot>/iff-config.json)                     [string]
  -s, --snippets     Show all snippets in the project                  [boolean]
  -t, --tags         Show all tags in the project                      [boolean]
  -g, --graph        Show the snippet graph of the project             [boolean]
      --open         Open the generated snippet graph in your browser
                     (--no-open to skip)             [boolean] [default: true]
  -v, --version      Show iffinity engine version number               [boolean]
  -h, --help         Show help                                         [boolean]
```

The `show` commands aims to help the user gain insight on their project, especially as it grows larger and larger. It's 3 main options as of v0.2.0 are the following:

## `ifc completion`

Prints a shell completion script for `ifc`. Add it to your shell config to get tab
completion for commands and options:

```
$ ifc completion >> ~/.bashrc
```

## `ifc watch`

Recompiling by hand after every edit gets old quickly on a project with hundreds of
snippets. `ifc watch` rebuilds whenever a source file changes:

```
$ ifc watch
Watching /home/sotiris/my-story for changes.
Press Ctrl+C to stop.

[14:22:05] initial build
...
Rendered game saved to My_Story.html. Enjoy!

[14:22:31] changed: snippets/chapter-1.ejs
...
Rendered game saved to My_Story.html. Enjoy!
```

It watches `.html`, `.htm`, `.ejs`, `.js`, `.css` and `.json` files under the project root,
ignoring `node_modules`, `.git`, `dist` and the compiled output itself. A build that fails
does not stop the watcher &mdash; fix the file, save, and it rebuilds.

It accepts the same `--projectRoot`, `--config` and `--outputFile` options as
`ifc compile`, plus `--debounce` (milliseconds to wait after a change before rebuilding,
default 150).

### `ifc show --snippets`

The `--snippets/-s` option shows a tree of each file in the project that contains at least one snippet, accompanied by the details of each snippet (name, tags, scripts, styles, whether it is the starting snippet).

Running it on the [convoluted example](https://github.com/sniarchos/iffinity/tree/HEAD/examples/convoluted):

```
$ ifc show --snippets
Snippets in project Three Snippets
(files relative to project root: <path>/iffinity/examples/convoluted)
|
├── some-snippets.ejs
│   ├── Magic Place
│   │   ├── tags: THE_WILD
│   │   ├── scripts: scripts/mp1.js, scripts/mp2.js
│   │   └── styles: styles/mp.css
│   ├── Intro [START]
│   └── Square
└── the-castle/the-castle.ejs
    └── Castle
        └── tags: THE_WILD, CASTLE
```

### `ifc show --tags`

The `--tags/-t` option shows a list of all the tags in the project, accompanied by the list of all the snippets that contain them.

Running it on the [convoluted example](https://github.com/sniarchos/iffinity/tree/HEAD/examples/convoluted):

```
$ ifc show --tags
Tags in project Three Snippets
(files relative to project root: /home/sotiris/projects/intfiction/iffinity/examples/convoluted)
|
├── THE_WILD
│   ├── Magic Place (some-snippets.ejs)
│   └── Castle (the-castle/the-castle.ejs)
└── CASTLE
    └── Castle (the-castle/the-castle.ejs)
```

### `ifc show --graph`

The `--graph/-g` option writes an interactive graph of the story's snippets and their links to
`snippet-graph.html` in the project root, and opens it in your default browser. Pass `--no-open` to write the file
without opening it (useful over SSH or in CI).

The graph is a read-only view; there is no way to affect the project through it. Nodes are coloured by kind:

|colour|meaning|
|---|---|
|amber|the starting snippet|
|green|a snippet defined in the project|
|red|a snippet that is **linked to but never defined**|

Those red nodes are worth paying attention to: a link pointing at a snippet that does not exist is a dead end in
your story, and the command also lists every one of them on the terminal. Edges to a missing snippet are drawn
dashed and red.

Transitions made in code with `story.showSnippet()` are invisible to the graph unless you declare them with the
[`<iff-link>` tag]({{ site.baseurl }}/story/#the-iff-link-tag).
