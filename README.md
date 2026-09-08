<picture>
  <source srcset="https://raw.githubusercontent.com/sniarchos/iffinity/HEAD/logos/PNGs/black-perimeter-filled-box-logo.png" media="(prefers-color-scheme: light)">
  <img src="https://raw.githubusercontent.com/sniarchos/iffinity/HEAD/logos/PNGs/white-perimeter-filled-box-logo.png" alt="iffinity">
</picture>

[![npm version](https://badge.fury.io/js/iffinity.svg)](https://badge.fury.io/js/iffinity)
[![CI](https://github.com/sniarchos/iffinity/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/sniarchos/iffinity/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## A minimal engine for browser, choice/hypertext based interactive fiction, with iffinite possibilities!

### What is this?

iffinity is an extremely minimal, command-line engine for browser, choice/hypertext based interactive fiction. It is heavily inspired by [Twine](https://twinery.org/), and especially by its [Snowman](https://videlais.github.io/snowman/#/) story format.

Full documentation can be found [here](https://sniarchos.github.io/iffinity/).

The main idea was that Twine and Snowman are great for IF authors that want to have the creative freedom that a real-world, full-fledged programming language like JavaScript provides, but eventually feel limiting and make it quite hard to maintain and organize a project with hundreds of passages. The situation in Twine/Snowman becomes even more frustrating when authors want to have a lot of logic in their stories, e.g. a lot of complicated minigames/puzzles, or states that are hard to track.

For the author of iffinity, the main limitation of Twine/Snowman is that there is no way to organize your own text/prose/code the way you want it; you only get to view/edit them inside a very limited, single-window interface. This is especially frustrating when you want to have a lot of code in your story, and you want to organize it in a way that makes sense to you, e.g. by having a separate file for each puzzle, or a separate file for each character, or a separate file for each location, etc.

iffinity is (or, at least, attempts to be) a solution to this problem. It gets everything that is great about Twine/Snowman, and adds the ability to organize your story in a way that makes sense to you, in however many files you want, and in whatever way you want. Then, you can run `ifc` and your story will be compiled into a single HTML file that you can open in your browser and play!

### How do I use it?

#### Installation

iffinity is written in Node.js with TypeScript, so you need to have Node.js installed on your computer in order to use it. **Node.js 20.18.1 or newer is required.** If you don't have Node.js installed, you can download it from [here](https://nodejs.org/en/download/).

Once you have Node.js installed, you can install iffinity by running the following command in your terminal:

```
npm install -g iffinity
```

After that, you should be able to run `ifc -h/--help` in your terminal and see the help message:

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

#### Creating a new project

To create a new project, you need to run `ifc init` in the directory where you want to create the project. The steps that follow closely resemble the steps of creating a new project with `npm init`:

```
$ mkdir iftest
$ cd iftest/
$ ifc init
This utility will walk you through creating an iff-config.json file.
It only covers the (required) "story" section of the file.

See https://sniarchos.github.io/iffinity/ for definitive documentation
on all possible fields and exactly what they do.

It is recommended to use the `ifc edit` command to change the config file later on.
Run `ifc edit --help` for more information.

Press ^C at any time to quit.

story title: (iftest)
author name: (sotiris)
author email:
version: (1.0.0)
git repository:
About to write the following config file to /home/sotiris/Desktop/iftest/iff-config.json:

{
    "story": {
        "title": "iftest",
        "author": {
            "name": "sotiris"
        },
        "version": "1.0.0"
    }
}

Is this ok? (yes)
Create a template project? (yes)
Done. You can now run `ifc` (or `ifc compile`) to compile your project.
$
```

#### An introductory example

As you can see at the bottom of the output, a template project is created by default. You can start with that and modify it to your liking, or you can start from scratch. You can find the template project that is being created in the [examples/simple](https://github.com/sniarchos/iffinity/tree/HEAD/examples/simple) directory of this repository. It is a single file, namely [examples/simple/example.ejs](examples/simple/example.ejs), and it contains the following code:

```ejs
<snippet name="Start" start>
    <% if (!s.WEALTH) s.WEALTH = 'poor'; %>

    <p>You are at the Start.</p>
    <p>Before you lies the [[Land of Opportunity]].</p>
    <br />
    <p>You are <strong><%= s.WEALTH %></strong>.</p>
</snippet>

<snippet name="Land of Opportunity">
    <%
        $(function() { // never forget that when accessing the DOM!
            $(".back").on("click", function() {
                s.WEALTH = $(this).attr('id');
                story.showSnippet('Start');
            });
        });
    %>

    <p>You are at the Land of Opportunity.</p>
    <p>Go back [[rich||#rich.back]] or go back [[poor||#poor.back]]?</p>
    <p>(or [[just go back|Start]] as you are...)</p>
</snippet>
```

Similar to Twine, an iffinity project is a `Story` that consists of `Snippet`s (i.e. passages in Twineland, but "snippet" sounds more minimal).

The author writes HTML files where each snippet is defined by a `<snippet>` tag. The `name` attribute of the tag is the name of the snippet, and the `start` attribute indicates that this snippet is the starting snippet of the story. The content of the tag is the HTML code of the snippet, including [EJS](https://ejs.co/) code that is evaluated when the snippet is shown.

Once again, similar to Twine/Snowman, the author can use double square brackets to create links to other snippets. There are 3 types of links and all can be seen in the example above:

- `[[Land of Opportunity]]` is a link to the snippet with name "Land of Opportunity".
- `[[just go back|Start]]` is a link to the snippet with name "Start", but the link text is "just go back".
- `[[rich||#rich.back]]` is a plain `<a>` link that doesn't point to any snippet. However, it has an `id` (`rich`) and a `class` (`back`), so it can be selected via JavaScript (e.g. using jQuery) and used to do something when it is clicked (e.g. could show/hide some `<div>` or, as it happens here, go to a different snippet with `story.showSnippet()` after modifying the state `s` of the story).

### Is that it?

That's just scratching the surface! There are different ways to organize your scripts, your stylesheets, a powerful tag system, and more!

To get to know the engine and see if it's for you, you can check out the documentation [here](https://sniarchos.github.io/iffinity/). There, you can find a lot more information about the engine, as well as the full documentation of the engine's author API.

### Can I contribute?

iffinity is still in its nascent stages, so there are a lot of things that can be improved, even at the level of design. In fact, the author's aspiration is that other like-minded IF creators will contribute to the project and help make it better, both in terms of the engine's design, as well as in terms of its implementation. So, email/PR/issue away!
