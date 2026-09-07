---
title: Installation & First Usage
layout: default
permalink: /intro/
nav_order: 1
---

# {{ page.title }}

* TOC
{:toc}

## Installation

iffinity requires **Node.js 20.18.1 or newer**.

You can install the iffinity engine via the npm registry:

```
npm i iffinity -g
```

After that, the `ifc` command line tool becomes available:

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
  -v, --version      Show iffinity engine version number               [boolean]
  -h, --help         Show help                                         [boolean]
```

## First usage

You can create a story right away, without editing a single file! To do that, create a new dictionary, navigate into it and run:

```
ifc init
```

This command will walk you through creating a very basic iffinity project, much like how `npm init` does it. Creating an iffinity project essentially means creating the project's configuration file.

The last question that the `ifc init` command will ask you is whether you want it to create a template project for you. Hit enter and an `example.ejs` file (along with the `iff-config.json` configuration file) will have appeared in your directory!

The `example.ejs` file contains an example story, with a single snippet. Run:

```
ifc
```

to compile the project. Once the compilation is done, an HTML file will have appeared in your directory. Open it with the browser of your choice and enjoy your first story!
