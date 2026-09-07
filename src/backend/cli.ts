#!/usr/bin/env node

import yargs from "yargs";
import { red } from "ansis/colors";
import path from "path";

const usageStr = `~~~ The iffinity engine compiler ~~~

Running $0 with no command is equivalent to running $0 compile.

For help and options of a specific command, run:
$0 <command> --help/-h (e.g. $0 show --help)

Usage: $0 [command] [commandOptions]`;

yargs
    .scriptName("ifc")
    .strict()
    .usage(usageStr)
    .version(
        "version",
        "Show iffinity engine version number",
        `iffinity engine v${
            require(path.join(__dirname, "..", "..", "package.json")).version
        }`
    )
    .command(
        ["$0 [options]", "compile [options]"],
        "Compile the project in the given directory to a single HTML file",
        (yargs) => {
            yargs
                .option("projectRoot", {
                    alias: "p",
                    describe:
                        "The root directory of the project (if not specified, the current directory is used)",
                    type: "string",
                })
                .option("config", {
                    alias: "c",
                    describe:
                        "Specify a configuration file for your project (default: <projectRoot>/iff-config.json)",
                    type: "string",
                })
                .option("outputFile", {
                    alias: "o",
                    describe: "The output HTML file path",
                    type: "string",
                })
                .option("testFrom", {
                    alias: "t",
                    describe:
                        "Test the story from a different snippet than the start snippet",
                    type: "string",
                })
                .check((argv) => {
                    if (argv.options) {
                        yargs.showHelp();
                        console.error();
                        console.error(`Unknown command: ${argv.options}`);
                        process.exit(1);
                    }
                    return true;
                });
        },
        async (argv) => {
            const compiler = await import("./utils/compiler");
            await compiler.compileProject(argv);
        }
    )
    .command(
        "watch [options]",
        "Recompile the project whenever a source file changes",
        (yargs) => {
            yargs
                .option("projectRoot", {
                    alias: "p",
                    describe:
                        "The root directory of the project (if not specified, the current directory is used)",
                    type: "string",
                })
                .option("config", {
                    alias: "c",
                    describe:
                        "Specify a configuration file for your project (default: <projectRoot>/iff-config.json)",
                    type: "string",
                })
                .option("outputFile", {
                    alias: "o",
                    describe: "The output HTML file path",
                    type: "string",
                })
                .option("debounce", {
                    describe:
                        "Milliseconds to wait after a change before rebuilding",
                    type: "number",
                    default: 150,
                })
                .example("$0 watch", "")
                .example("$0 watch -p ./my-story", "");
        },
        async (argv) => {
            const watcher = await import("./utils/watcher");
            await watcher.watchProject(argv);
        }
    )
    .command(
        "init",
        "Create a new iffinity project in the current directory",
        {},
        async (_) => {
            const initializer = await import("./utils/initializer");
            await initializer.initializeProject();
        }
    )
    .command(
        "edit [options]",
        "Edit the configuration file of the project",
        (yargs) => {
            yargs
                .option("config", {
                    alias: "c",
                    describe:
                        "Specify a configuration file for your project (default: <projectRoot>/iff-config.json)",
                    type: "string",
                })
                .option("title", {
                    describe: "Change the title of the story",
                    type: "string",
                })
                .option("author-name", {
                    describe: "Change the name of the story author",
                    type: "string",
                })
                .option("author-email", {
                    describe: "Change the email of the story author",
                    type: "string",
                })
                .option("story-version", {
                    describe: "Change the version of the story",
                    type: "string",
                })
                .option("repo", {
                    describe: "Change the repository of the story",
                    type: "string",
                })
                .option("add-lib-scripts", {
                    describe: "Append library script(s) to the story",
                    type: "array",
                })
                .option("remove-lib-scripts", {
                    describe: "Remove library script(s) from the story",
                    type: "array",
                })
                .option("clear-lib-scripts", {
                    describe: "Remove all library scripts from the story",
                    type: "boolean",
                })
                .option("add-lib-styles", {
                    describe: "Append library style(s) to the story",
                    type: "array",
                })
                .option("remove-lib-styles", {
                    describe: "Remove library style(s) from the story",
                    type: "array",
                })
                .option("clear-lib-styles", {
                    describe: "Remove all library styles from the story",
                    type: "boolean",
                })
                .option("add-story-scripts", {
                    describe: "Append story script(s) to the story",
                    type: "array",
                })
                .option("remove-story-scripts", {
                    describe: "Remove story script(s) from the story",
                    type: "array",
                })
                .option("clear-story-scripts", {
                    describe: "Remove all story scripts from the story",
                    type: "boolean",
                })
                .option("add-story-styles", {
                    describe: "Append story style(s) to the story",
                    type: "array",
                })
                .option("remove-story-styles", {
                    describe: "Remove story style(s) from the story",
                    type: "array",
                })
                .option("clear-story-styles", {
                    describe: "Remove all story styles from the story",
                    type: "boolean",
                })
                .option("add-global-scripts", {
                    describe: "Append global script(s) to the story",
                    type: "array",
                })
                .option("remove-global-scripts", {
                    describe: "Remove global script(s) from the story",
                    type: "array",
                })
                .option("clear-global-scripts", {
                    describe: "Remove all global scripts from the story",
                    type: "boolean",
                })
                .option("add-script-tag-rule", {
                    describe:
                        "Add a tag rule to the story, along with the corresponding script(s)",
                    type: "array",
                })
                .option("remove-script-tag-rule", {
                    describe:
                        "Remove a tag rule from the story, along with the corresponding script",
                    type: "string",
                })
                .option("add-style-tag-rule", {
                    describe:
                        "Add a tag rule to the story, along with the corresponding style(s)",
                    type: "array",
                })
                .option("remove-style-tag-rule", {
                    describe:
                        "Remove a tag rule from the story, along with the corresponding style",
                    type: "string",
                })
                .example("$0 edit --story-version 1.1.0", "")
                .example("$0 edit --repo https://github.com/user/repo.git", "")
                .example(
                    "$0 edit --add-global-scripts global-vars.js global-logic.js",
                    ""
                )
                .example(
                    "$0 edit --add-script-tag-rule 'TAG1 && !TAG2' script1.js script2.js",
                    ""
                )
                .example("$0 edit --remove-style-tag-rule 'TAG1 || TAG2'", "")
                .check((argv) => {
                    if (Object.keys(argv).length <= 2) {
                        yargs.showHelp();
                        process.exit(0);
                    }
                    Object.entries(argv).forEach(([key, value]) => {
                        if (key === "$0") return;
                        if (
                            value === "" ||
                            (Array.isArray(value) && value.length === 0)
                        ) {
                            console.error(
                                `${red(
                                    "Error:"
                                )} option \`${key}\` requires a value. Aborting.`
                            );
                            process.exit(1);
                        }
                    });
                    return true;
                });
        },
        async (argv) => {
            const config = await import("./utils/config");
            config.editConfigFile(argv);
        }
    )
    .command(
        "show [options]",
        "Show several project details",
        (yargs) => {
            yargs
                .option("projectRoot", {
                    alias: "p",
                    describe: "The root directory of the project",
                    type: "string",
                })
                .option("config", {
                    alias: "c",
                    describe:
                        "Specify a configuration file for your project (default: <projectRoot>/iff-config.json)",
                    type: "string",
                })
                .option("snippets", {
                    alias: "s",
                    describe: "Show all snippets in the project",
                    type: "boolean",
                })
                .option("tags", {
                    alias: "t",
                    describe: "Show all tags in the project",
                    type: "boolean",
                })
                .option("graph", {
                    alias: "g",
                    describe: "Show the snippet graph of the project",
                    type: "boolean",
                })
                .option("open", {
                    describe:
                        "Open the generated snippet graph in your browser (--no-open to skip)",
                    type: "boolean",
                    default: true,
                })
                .check((argv) => {
                    if (Object.keys(argv).length === 2) {
                        yargs.showHelp();
                        process.exit(0);
                    }
                    return true;
                });
        },
        async (argv) => {
            const viewer = await import("./utils/viewer");
            await viewer.showProjectDetails(argv);
        }
    )
    .alias("v", "version")
    .alias("h", "help")
    .completion()
    .help().argv;
