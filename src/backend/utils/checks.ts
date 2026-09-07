import { green, red, yellow } from "ansis/colors";
import { Config, asArray } from "../types/Config";
import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import { containsMaskedCode } from "./crawler";

export function checkConfig(
    config: Config | undefined,
    projectRootDir: string,
    printInfo = true
) {
    if (printInfo) console.groupCollapsed("Config checks");
    if (!config) {
        console.error(
            `${red(
                "Error:"
            )} inexistent, empty or malformed config file. Aborting.`
        );
        process.exit(1);
    }
    if (!config.story) {
        console.error(
            `${red("Error:")} "story" config entry is empty. Aborting.`
        );
        process.exit(1);
    }
    if (!config.story.title) {
        console.error(
            `${red("Error:")} story title missing from config file. Aborting.`
        );
        process.exit(1);
    } else if (printInfo) {
        console.info(`Story title: ${green(config.story.title)}`);
    }
    if (!config.story.author) {
        console.error(
            `${red("Error:")} story author missing from config file. Aborting.`
        );
        process.exit(1);
    } else {
        if (!config.story.author.name) {
            console.error(
                `${red(
                    "Error:"
                )} story author name missing from config file. Aborting.`
            );
            process.exit(1);
        } else if (printInfo) {
            console.info(
                `Story author name: ${green(config.story.author.name)}`
            );
        }
        if (printInfo && config.story.author.email) {
            console.info(
                `Story author email: ${green(config.story.author.email)}`
            );
        }
    }
    if (!config.story.version) {
        console.error(
            `${yellow(
                "Warning:"
            )} story version missing from config file. Defaulting to ${green(
                "1.0.0"
            )}`
        );
    } else if (printInfo) {
        console.info(`Story version: ${green(config.story.version)}`);
    }
    if (config.scripts?.story) {
        for (const script of asArray(config.scripts.story)) {
            if (!fs.existsSync(path.join(projectRootDir, script))) {
                console.error(
                    `${red("Error:")} story code file "${script}" not found.`
                );
                process.exit(1);
            }
        }
        if (printInfo)
            console.info(
                `Specified story code file(s): ${green(
                    asArray(config.scripts.story).join(", ")
                )}`
            );
    }
    if (config.scripts?.global) {
        for (const script of asArray(config.scripts.global)) {
            if (!fs.existsSync(path.join(projectRootDir, script))) {
                console.error(
                    `${red("Error:")} global code file "${script}" not found.`
                );
                process.exit(1);
            }
        }
        if (printInfo)
            console.info(
                `Specified global code file(s): ${green(
                    asArray(config.scripts.global).join(", ")
                )}`
            );
    }
    if (config.styles?.story) {
        for (const style of asArray(config.styles.story)) {
            if (!fs.existsSync(path.join(projectRootDir, style))) {
                console.error(
                    `${red("Error:")} story style file "${style}" not found.`
                );
                process.exit(1);
            }
        }
        if (printInfo)
            console.info(
                `Specified story style file(s): ${green(
                    asArray(config.styles.story).join(", ")
                )}`
            );
    }
    if (printInfo) console.groupEnd();
}

export function performInitialSanityChecks(
    userSnippets: cheerio.Cheerio<Element>,
    numUserFiles: number
) {
    console.groupCollapsed("Basic sanity checks");
    const numUserSnippets = userSnippets.length;
    const snippetsColor = numUserSnippets === 0 ? red : green;
    const filesColor = numUserFiles === 0 ? red : green;
    console.info(
        `Found ${snippetsColor(
            numUserSnippets.toString()
        )} snippet(s) across ${filesColor(numUserFiles.toString())} file(s).`
    );
    if (numUserSnippets === 0) {
        console.error(
            `Please make sure you have at least one snippet in your project. Aborting.`
        );
        process.exit(1);
    }
    if (numUserFiles === 0) {
        console.error(
            `Please make sure you have at least one HTML or EJS file in your project. Aborting.`
        );
        process.exit(1);
    }

    let numUnnamedSnippets = userSnippets.filter((_, snippet) => {
        const name = snippet.attribs?.name;
        return !name || name.trim().length === 0;
    }).length;
    if (numUnnamedSnippets > 0) {
        console.error(
            `${red("Error:")} found ${red(
                numUnnamedSnippets.toString()
            )} unnamed snippet(s). Aborting.`
        );
        process.exit(1);
    }

    let numStartingSnippets = userSnippets.filter("[start]").length;
    const startingSnippetsColor = numStartingSnippets === 1 ? green : red;
    console.info(
        `Found ${startingSnippetsColor(
            numStartingSnippets.toString()
        )} starting snippet(s).`
    );
    if (numStartingSnippets !== 1) {
        if (numStartingSnippets > 1) {
            console.error("Multiple starting snippets found:");
            userSnippets.filter("[start]").each((_, snippet) => {
                console.error(`- ${snippet.attribs?.name}`);
            });
        }
        console.error(
            `Please make sure you have exactly one snippet with the "start" attribute set to true. Aborting.`
        );
        process.exit(1);
    }
    console.groupEnd();
}

/**
 * Verify that every snippet link resolves to a snippet that exists.
 *
 * Twine showed broken links in the editor; iffinity has no editor, so without
 * this a typo in a link name is only discovered by clicking it. Targets that
 * are computed at render time (e.g. `[[Continue|<%- dest %>]]`) cannot be
 * checked and are skipped.
 *
 * @returns the number of broken links found
 */
export function checkSnippetLinks(
    userSnippets: cheerio.Cheerio<Element>,
    $: cheerio.CheerioAPI,
    strict = false
): number {
    const defined = new Set<string>();
    userSnippets.each((_, snippet) => {
        const name = snippet.attribs?.name;
        if (name) defined.add(name.trim());
    });

    // target -> the snippets that link to it
    const broken = new Map<string, Set<string>>();
    let dynamic = 0;

    userSnippets.each((_, snippet) => {
        const from = (snippet.attribs?.name || "?").trim();
        const targets: string[] = [];

        $(snippet)
            .find("a[data-snippet]")
            .each((_i, a) => {
                targets.push($(a).attr("data-snippet") ?? "");
            });
        $(snippet)
            .find("iff-link")
            .each((_i, l) => {
                targets.push($(l).text());
            });

        for (const raw of targets) {
            const target = raw.trim();
            if (!target) continue;
            if (containsMaskedCode(target)) {
                dynamic++;
                continue;
            }
            if (defined.has(target)) continue;
            if (!broken.has(target)) broken.set(target, new Set());
            broken.get(target)!.add(from);
        }
    });

    if (broken.size === 0) {
        console.info(
            `All snippet links resolve` +
                (dynamic > 0
                    ? ` (${dynamic} computed at runtime, not checked)`
                    : "")
        );
        return 0;
    }

    const total = [...broken.values()].reduce((n, s) => n + s.size, 0);
    const label = strict ? red("Error:") : yellow("Warning:");
    console.error(
        `${label} ${total} link(s) point to snippets that do not exist:`
    );
    for (const [target, froms] of broken) {
        console.error(
            `  ${red(target)} <- linked from ${[...froms]
                .map((f) => yellow(f))
                .join(", ")}`
        );
    }
    if (strict) {
        console.error("Aborting.");
        process.exit(1);
    }
    return total;
}
