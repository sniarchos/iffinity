import fs from "fs";
import path from "path";
import { Config, StringOrStringArray, TagRule, asArray } from "../types/Config";
import yargs from "yargs";
import { checkConfig } from "./checks";
import { green, red, yellow } from "ansis/colors";

function readConfigFile(configFilePath: string): Config {
    try {
        // strip a UTF-8 BOM: JSON.parse rejects it, and Windows editors add
        // one by default, which otherwise surfaces as "malformed config file"
        const raw = fs.readFileSync(configFilePath, "utf8").replace(/^﻿/, "");
        return JSON.parse(raw) as Config;
    } catch (error) {
        console.error(
            `${red(
                "Error:"
            )} inexistent, empty or malformed config file. Aborting.`
        );
        process.exit(1);
    }
}

function newFileList(
    prevFileList: StringOrStringArray,
    filesToAdd: string[],
    filesToRemove: string[],
    fieldName: string
): StringOrStringArray {
    const _prevFileList = asArray(prevFileList);

    const toActuallyRemove = [] as string[];
    filesToRemove.forEach((file) => {
        if (!_prevFileList.includes(file))
            console.warn(
                `${yellow(
                    "Warning:"
                )} file ${file} not present in \`${fieldName}\`, so it won't be removed. Skipping...`
            );
        else toActuallyRemove.push(file);
    });

    const toActuallyAdd = [] as string[];
    filesToAdd.forEach((file) => {
        if (_prevFileList.includes(file))
            console.warn(
                `${yellow(
                    "Warning:"
                )} file ${file} already present in \`${fieldName}\`, so it won't be added. Skipping...`
            );
        else toActuallyAdd.push(file);
    });

    const newFileList = _prevFileList
        .filter((file) => !filesToRemove.includes(file))
        .concat(filesToAdd);

    if (toActuallyRemove.length > 0)
        console.log(
            `Removed ${toActuallyRemove
                .map(red)
                .join(", ")} from \`${fieldName}\``
        );

    if (toActuallyAdd.length > 0)
        console.log(
            `Added ${toActuallyAdd.map(green).join(", ")} to \`${fieldName}\``
        );

    if (toActuallyRemove.length > 0 || toActuallyAdd.length > 0)
        console.log(
            `\`${fieldName}\` set to ${newFileList.map(green).join(", ")}`
        );
    else
        console.log(
            `\`${fieldName}\` unchanged: ${newFileList.map(green).join(", ")}`
        );

    return newFileList.length === 1 ? newFileList[0] : newFileList;
}

export function loadConfigFile(
    argv: yargs.Arguments,
    check = true,
    printInfo = true
): Config {
    const projectRootPath = (argv.projectRoot as string) || process.cwd();
    const configFilePath =
        (argv.config as string) ||
        path.join(projectRootPath, "iff-config.json");

    const config = readConfigFile(configFilePath);
    if (check) checkConfig(config, projectRootPath, printInfo);

    return config;
}

export function editConfigFile(argv: yargs.Arguments) {
    const projectRootPath = (argv.projectRoot as string) || process.cwd();
    const configFilePath = path.join(projectRootPath, "iff-config.json");
    const config = loadConfigFile(argv, false);

    if (argv.title) {
        config.story.title = argv.title as string;
        console.log(`Story title set to ${green(argv.title as string)}`);
    }
    if (argv.authorName) {
        config.story.author.name = argv.authorName as string;
        console.log(
            `Story author name set to ${green(argv.authorName as string)}`
        );
    }
    if (argv.authorEmail) {
        config.story.author.email = argv.authorEmail as string;
        console.log(
            `Story author email set to ${green(argv.authorEmail as string)}`
        );
    }
    if (argv.storyVersion) {
        config.story.version = argv.storyVersion as string;
        console.log(
            `Story version set to ${green(argv.storyVersion as string)}`
        );
    }
    if (argv.repo) {
        config.story.repository = {
            type: "git",
            url: argv.repo as string,
        };
        console.log(
            `Story git repository set to ${green(argv.repo as string)}`
        );
    }
    if (argv.addLibScripts) {
        const newLibScripts = argv.addLibScripts as string[];
        if (!config.libraries) config.libraries = {};
        if (!config.libraries.scripts) config.libraries.scripts = [];
        config.libraries.scripts = newFileList(
            config.libraries.scripts,
            newLibScripts,
            [],
            "libraries.scripts"
        );
    }
    if (argv.removeLibScripts) {
        const libScriptsToRemove = argv.removeLibScripts as string[];
        if (!config.libraries) config.libraries = {};
        if (!config.libraries.scripts) config.libraries.scripts = [];
        config.libraries.scripts = newFileList(
            config.libraries.scripts,
            [],
            libScriptsToRemove,
            "libraries.scripts"
        );
        if (config.libraries.scripts.length === 0)
            delete config.libraries.scripts;
        if (Object.keys(config.libraries).length === 0) delete config.libraries;
    }
    if (argv.clearLibScripts) {
        delete config.libraries?.scripts;
        if (Object.keys(config.libraries as any).length === 0)
            delete config.libraries;
        console.log(`Cleared \`libraries.scripts\``);
    }
    if (argv.addLibStyles) {
        const newLibStyles = argv.addLibStyles as string[];
        if (!config.libraries) config.libraries = {};
        if (!config.libraries.styles) config.libraries.styles = [];
        config.libraries.styles = newFileList(
            config.libraries.styles,
            newLibStyles,
            [],
            "libraries.styles"
        );
    }
    if (argv.removeLibStyles) {
        const libStylesToRemove = argv.removeLibStyles as string[];
        if (!config.libraries) config.libraries = {};
        if (!config.libraries.styles) config.libraries.styles = [];
        config.libraries.styles = newFileList(
            config.libraries.styles,
            [],
            libStylesToRemove,
            "libraries.styles"
        );
        if (config.libraries.styles.length === 0)
            delete config.libraries.styles;
        if (Object.keys(config.libraries).length === 0) delete config.libraries;
    }
    if (argv.clearLibStyles) {
        delete config.libraries?.styles;
        if (Object.keys(config.libraries as any).length === 0)
            delete config.libraries;
        console.log(`Cleared \`libraries.styles\``);
    }
    if (argv.addStoryScripts) {
        const newStoryScripts = argv.addStoryScripts as string[];
        if (!config.scripts) config.scripts = {};
        if (!config.scripts.story) config.scripts.story = [];
        config.scripts.story = newFileList(
            config.scripts.story,
            newStoryScripts,
            [],
            "scripts.story"
        );
    }
    if (argv.removeStoryScripts) {
        const storyScriptsToRemove = argv.removeStoryScripts as string[];
        if (!config.scripts) config.scripts = {};
        if (!config.scripts.story) config.scripts.story = [];
        config.scripts.story = newFileList(
            config.scripts.story,
            [],
            storyScriptsToRemove,
            "scripts.story"
        );
        if (config.scripts.story.length === 0) delete config.scripts.story;
        if (Object.keys(config.scripts).length === 0) delete config.scripts;
    }
    if (argv.clearStoryScripts) {
        delete config.scripts?.story;
        if (Object.keys(config.scripts as any).length === 0)
            delete config.scripts;
        console.log(`Cleared \`scripts.story\``);
    }
    if (argv.addStoryStyles) {
        const newStoryStyles = argv.addStoryStyles as string[];
        if (!config.styles) config.styles = {};
        if (!config.styles.story) config.styles.story = [];
        config.styles.story = newFileList(
            config.styles.story,
            newStoryStyles,
            [],
            "styles.story"
        );
    }
    if (argv.removeStoryStyles) {
        const storyStylesToRemove = argv.removeStoryStyles as string[];
        if (!config.styles) config.styles = {};
        if (!config.styles.story) config.styles.story = [];
        config.styles.story = newFileList(
            config.styles.story,
            [],
            storyStylesToRemove,
            "styles.story"
        );
        if (config.styles.story.length === 0) delete config.styles.story;
        if (Object.keys(config.styles).length === 0) delete config.styles;
    }
    if (argv.clearStoryStyles) {
        delete config.styles?.story;
        if (Object.keys(config.styles as any).length === 0)
            delete config.styles;
        console.log(`Cleared \`styles.story\``);
    }
    if (argv.addGlobalScripts) {
        const newGlobalScripts = argv.addGlobalScripts as string[];
        if (!config.scripts) config.scripts = {};
        if (!config.scripts.global) config.scripts.global = [];
        config.scripts.global = newFileList(
            config.scripts.global,
            newGlobalScripts,
            [],
            "scripts.global"
        );
    }
    if (argv.removeGlobalScripts) {
        const globalScriptsToRemove = argv.removeGlobalScripts as string[];
        if (!config.scripts) config.scripts = {};
        if (!config.scripts.global) config.scripts.global = [];
        config.scripts.global = newFileList(
            config.scripts.global,
            [],
            globalScriptsToRemove,
            "scripts.global"
        );
        if (config.scripts.global.length === 0) delete config.scripts.global;
        if (Object.keys(config.scripts).length === 0) delete config.scripts;
    }
    if (argv.clearGlobalScripts) {
        if (!config.scripts) config.scripts = {};
        config.scripts.global = [];
        console.log(`Cleared \`scripts.global\``);
    }
    if (argv.addScriptTagRule) {
        const newTagScriptRuleList = argv.addScriptTagRule as string[];
        if (newTagScriptRuleList.length < 2)
            console.warn(
                `${yellow(
                    "Error:"
                )} \`add-script-tag-rule\` requires at least 2 arguments (a tag rule and a script file). Skipping...`
            );
        else {
            const newTagRule = {
                rule: newTagScriptRuleList[0],
                files:
                    newTagScriptRuleList.length > 2
                        ? newTagScriptRuleList.slice(1)
                        : newTagScriptRuleList[1],
            } as TagRule;
            if (!config.scripts) config.scripts = {};
            if (!config.scripts.tags) config.scripts.tags = [];
            const existingRuleIndex = config.scripts.tags.findIndex(
                (rule) => rule.rule === newTagRule.rule
            );
            if (existingRuleIndex >= 0) {
                console.warn(
                    `${yellow("Warning:")} tag rule ${
                        newTagRule.rule
                    } already exists.`
                );
                console.warn(
                    "If you want to update it, remove it first with the `remove-script-tag-rule` option."
                );
                console.warn("Skipping...");
            } else {
                config.scripts.tags.push(newTagRule);
                console.log(
                    `Added tag rule ${green(
                        newTagRule.rule
                    )} with script(s) ${asArray(newTagRule.files)
                        .map(green)
                        .join(", ")}`
                );
                console.log("`scripts.tags` set to:");
                for (const rule of config.scripts.tags)
                    console.log(
                        `\t${green(rule.rule)}: ${asArray(rule.files)
                            .map(green)
                            .join(", ")}`
                    );
            }
        }
    }
    if (argv.removeScriptTagRule) {
        const tagScriptRuleToRemove = argv.removeScriptTagRule as string;
        const existingRuleIndex = config.scripts?.tags?.findIndex(
            (rule) => rule.rule === tagScriptRuleToRemove
        );
        if (existingRuleIndex === undefined || existingRuleIndex < 0)
            console.warn(
                `${yellow(
                    "Warning:"
                )} tag rule ${tagScriptRuleToRemove} doesn't exist. Skipping...`
            );
        else {
            if (!config.scripts) config.scripts = {};
            if (!config.scripts.tags) config.scripts.tags = [];
            config.scripts.tags.splice(existingRuleIndex, 1);
            console.log(
                `Removed tag rule ${red(
                    tagScriptRuleToRemove
                )} and its script(s)`
            );
            if (config.scripts.tags.length > 0) {
                console.log("`scripts.tags` set to:");
                for (const rule of config.scripts.tags)
                    console.log(
                        `\t${green(rule.rule)}: ${asArray(rule.files)
                            .map(green)
                            .join(", ")}`
                    );
            } else {
                console.log("`scripts.tags` cleared");
                delete config.scripts.tags;
                if (Object.keys(config.scripts).length === 0)
                    delete config.scripts;
            }
        }
    }
    if (argv.addStyleTagRule) {
        const newTagStyleRuleList = argv.addStyleTagRule as string[];
        if (newTagStyleRuleList.length < 2)
            console.warn(
                `${yellow(
                    "Error:"
                )} \`add-style-tag-rule\` requires at least 2 arguments (a tag rule and a style file). Skipping...`
            );
        else {
            const newTagRule = {
                rule: newTagStyleRuleList[0],
                files:
                    newTagStyleRuleList.length > 2
                        ? newTagStyleRuleList.slice(1)
                        : newTagStyleRuleList[1],
            } as TagRule;
            if (!config.styles) config.styles = {};
            if (!config.styles.tags) config.styles.tags = [];
            const existingRuleIndex = config.styles.tags.findIndex(
                (rule) => rule.rule === newTagRule.rule
            );
            if (existingRuleIndex >= 0) {
                console.warn(
                    `${yellow("Warning:")} tag rule ${
                        newTagRule.rule
                    } already exists.`
                );
                console.warn(
                    "If you want to update it, remove it first with the `remove-style-tag-rule` option."
                );
                console.warn("Skipping...");
            } else {
                config.styles.tags.push(newTagRule);
                console.log(
                    `Added tag rule ${green(
                        newTagRule.rule
                    )} with style(s) ${asArray(newTagRule.files)
                        .map(green)
                        .join(", ")}`
                );
                console.log("`styles.tags` set to:");
                for (const rule of config.styles.tags)
                    console.log(
                        `\t${green(rule.rule)}: ${asArray(rule.files)
                            .map(green)
                            .join(", ")}`
                    );
            }
        }
    }
    if (argv.removeStyleTagRule) {
        const tagStyleRuleToRemove = argv.removeStyleTagRule as string;
        const existingRuleIndex = config.styles?.tags?.findIndex(
            (rule) => rule.rule === tagStyleRuleToRemove
        );
        if (existingRuleIndex === undefined || existingRuleIndex < 0)
            console.warn(
                `${yellow(
                    "Warning:"
                )} tag rule ${tagStyleRuleToRemove} doesn't exist. Skipping...`
            );
        else {
            if (!config.styles) config.styles = {};
            if (!config.styles.tags) config.styles.tags = [];
            config.styles.tags.splice(existingRuleIndex, 1);
            console.log(
                `Removed tag rule ${red(tagStyleRuleToRemove)} and its style(s)`
            );
            if (config.styles.tags.length > 0) {
                console.log("`styles.tags` set to:");
                for (const rule of config.styles.tags)
                    console.log(
                        `\t${green(rule.rule)}: ${asArray(rule.files)
                            .map(green)
                            .join(", ")}`
                    );
            } else {
                console.log("`styles.tags` cleared");
                delete config.styles.tags;
                if (Object.keys(config.styles).length === 0)
                    delete config.styles;
            }
        }
    }

    console.log();
    console.log("Updated project config:");
    console.log(JSON.stringify(config, null, 4));

    try {
        fs.writeFileSync(
            configFilePath,
            JSON.stringify(config, null, 4) + "\n"
        );
        console.log();
        console.log(`Config file ${configFilePath} updated.`);
    } catch (error: any) {
        console.error(
            `${red("Error")} while writing config file: ${
                error.message
            }. Aborting.`
        );
        process.exit(1);
    }
}
