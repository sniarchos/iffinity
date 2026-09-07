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
  ifc init               Create a new iffinity project in the current directory
  ifc edit [options]     Edit the configuration file of the project
  ifc show [options]     Show several project details

Options:
  -p, --projectRoot  The root directory of the project (if not specified, the
                     current directory is used)                         [string]
  -c, --config       Specify a configuration file for your project (default:
                     <projectRoot>/iff-config.json)                     [string]
  -o, --outputFile   The output HTML file path                          [string]
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
  -o, --outputFile   The output HTML file path                          [string]
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
So far so good. Compiling...
Rendered game saved to test.html. Enjoy!
```

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
  -v, --version      Show iffinity engine version number               [boolean]
  -h, --help         Show help                                         [boolean]
```

The `show` commands aims to help the user gain insight on their project, especially as it grows larger and larger. It's 3 main options as of v0.2.0 are the following:

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

This is an **EXPERIMENTAL** option. Running it will open a browser window with an interactive graph of the story snippets and their links. The starting snippet is drawn in blue, while all others in green. Interactive *doesn't* mean editable; there is no way to affect the project via the graph. In other words, it is a read-only view of the project.
