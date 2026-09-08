import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import {
    readAllHtmlAndEjsFilesUnder,
    resetCodeStash,
    unmaskCode,
} from "./crawler";
import {
    performInitialSanityChecks,
    checkSnippetLinks,
    checkTemplates,
    checkCodeTargets,
    checkDuplicateIds,
    Template,
} from "./checks";
import { loadConfigFile } from "./config";
import { parseTagsScriptsAndStyles } from "./tags";
import { parseSnippetCodeAndStyle } from "./snippets";
import yargs from "yargs";
import { bold, green, red } from "ansis/colors";
import { decode, encode } from "html-entities";
import { asArray, concatFileContents } from "../types/Config";

export async function compileProject(argv: yargs.Arguments): Promise<void> {
    const projectRootPath = (argv.projectRoot as string) || process.cwd();
    const config = loadConfigFile(argv);
    const defaultOutputName =
        (config.story.title + (argv.testFrom ? "_from_" + argv.testFrom : ""))
            .replace(/[ -]/g, "_")
            .replace(/[^a-zA-Z0-9_]/g, "") + ".html";
    let outputFilePath =
        (argv.outputFile as string) ||
        path.join(projectRootPath, defaultOutputName);

    resetCodeStash();
    let [allUserSource, allUserFiles] = await readAllHtmlAndEjsFilesUnder(
        projectRootPath,
        config
    );

    const $ = cheerio.load(allUserSource);
    const userSnippets = $("snippet");

    performInitialSanityChecks(userSnippets, allUserFiles.length);
    checkSnippetLinks(userSnippets, $, config.strictLinks === true);
    // An author who has explicitly silenced no-dup-id meant it; honour that
    const dupIdRule = config.validation?.["no-dup-id"];
    if (dupIdRule !== "off" && dupIdRule !== 0 && dupIdRule !== false)
        checkDuplicateIds(userSnippets, $);
    console.info("So far so good. Compiling...");

    const outputHTML = cheerio.load(
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title></title>
</head>
<body>
    <div id="iff-story">
        <div id="iff-snippet"></div>
    </div>
</body>
</html>
`
    );

    outputHTML("title").text(config.story.title);

    let storyDataElem = $('<div id="iff-story-data"></div>');
    let foundTestingSnippet = false;
    const scriptsContents = new Map<string, string>();
    const stylesContents = new Map<string, string>();
    // everything that must survive `ejs.compile()` before the build is called
    // a success; collected as we go, checked in one pass at the end
    const templates: Template[] = [];

    userSnippets.each((_, snippet) => {
        const snippetElem = $(snippet);

        let snippetDataElem = $(
            '<div class="iff-snippet-data"></div>'
        ) as cheerio.Cheerio<Element>;
        snippetDataElem.html(snippetElem.html() ?? "");
        // remove all <iff-link> elements from the snippet
        snippetDataElem.find("iff-link").remove();

        for (const k in snippetElem.attr())
            snippetDataElem.attr("data-" + k, snippetElem.attr(k));
        snippetDataElem.attr("data-all-scripts", "");
        snippetDataElem.attr("data-all-styles", "");

        if (argv.testFrom) {
            if (snippetDataElem.data("name") === argv.testFrom) {
                console.log(
                    `Overriding starting snippet to ${green(
                        argv.testFrom.toString()
                    )} as requested.`
                );
                snippetDataElem.attr("data-start", "");
                foundTestingSnippet = true;
            } else {
                snippetDataElem.removeAttr("data-start");
            }
        }

        try {
            // tag-related code and style
            const [snippetTagScripts, snippetTagStyles] =
                parseTagsScriptsAndStyles(
                    snippetDataElem,
                    config,
                    projectRootPath
                );
            snippetTagScripts.forEach((value, key) =>
                scriptsContents.set(key, value)
            );
            snippetTagStyles.forEach((value, key) =>
                stylesContents.set(key, value)
            );

            // snippet-specific code and style
            const [snippetScripts, snippetStyles] = parseSnippetCodeAndStyle(
                snippetDataElem,
                projectRootPath
            );
            snippetScripts.forEach((value, key) =>
                scriptsContents.set(key, value)
            );
            snippetStyles.forEach((value, key) =>
                stylesContents.set(key, value)
            );
        } catch (e) {
            console.error(
                `${red("Error")} while processing snippet ${red(
                    snippetDataElem.data("name") as string
                )}:`
            );
            console.error(" - " + (e as Error).message);
            console.error("Aborting.");
            process.exit(1);
        }

        // replace data-scripts and data-styles with data-all-scripts and data-all-styles
        // (this also protects user's -absolute- paths from being exposed in the final HTML)
        const allScripts = snippetDataElem.attr("data-all-scripts") as string;
        snippetDataElem.attr("data-scripts", allScripts);
        snippetDataElem.removeAttr("data-all-scripts");

        const allStyles = snippetDataElem.attr("data-all-styles") as string;
        snippetDataElem.attr("data-styles", allStyles);
        snippetDataElem.removeAttr("data-all-styles");

        // unmask + decode gives back exactly the source the runtime hands EJS
        templates.push({
            label: (snippetDataElem.data("name") as string) ?? "(unnamed)",
            kind: "snippet",
            source: decode(unmaskCode(snippetDataElem.html() ?? "")),
        });

        storyDataElem.append(snippetDataElem);
    });

    if (argv.testFrom && !foundTestingSnippet) {
        console.error(
            `${red("Error:")} snippet ${red(
                argv.testFrom.toString()
            )} (requested as testing starting point) not found.`
        );
        console.error("Aborting.");
        process.exit(1);
    }

    // save title, author and version in the story data
    storyDataElem.attr("data-title", config.story.title);
    storyDataElem.attr("data-author-name", config.story.author.name);
    storyDataElem.attr("data-author-email", config.story.author.email ?? "");
    storyDataElem.attr("data-version", config.story.version ?? "1.0.0");

    storyDataElem.attr("hidden", "");
    outputHTML("body").append(storyDataElem);

    /**
     * engine code
     */
    outputHTML("head").append(
        `<script>${fs.readFileSync(
            path.join(
                path.dirname(__dirname),
                "..",
                "frontend",
                "iffinity-browser.js"
            ),
            "utf8"
        )}</script>`
    );

    /**
     * user libraries
     */
    // TODO: add support for external libraries and option to bundle them
    //       (right now, they are just copied as-is)
    if (config.libraries?.styles)
        for (const style of asArray(config.libraries.styles)) {
            let fullFilePath = path.join(projectRootPath, style);
            if (!fs.existsSync(fullFilePath))
                console.warn(
                    `Script library "${fullFilePath}" not found, skipping...`
                );
            else
                outputHTML("head").append(
                    `<style>${fs.readFileSync(
                        path.join(projectRootPath, style),
                        "utf8"
                    )}</style>`
                );
        }

    if (config.libraries?.scripts)
        for (const script of asArray(config.libraries.scripts)) {
            let fullFilePath = path.join(projectRootPath, script);
            if (!fs.existsSync(fullFilePath))
                console.warn(
                    `Script library "${fullFilePath}" not found, skipping...`
                );
            else
                outputHTML("head").append(
                    `<script>${fs.readFileSync(
                        path.join(projectRootPath, script),
                        "utf8"
                    )}</script>`
                );
        }

    /**
     * user story code
     */
    // append story code files to the body as simple
    // text, the engine code will take care of it
    if (config.scripts?.story) {
        const fullStoryCode = concatFileContents(
            projectRootPath,
            config.scripts.story
        );
        outputHTML("#iff-story-data").append(
            `<div id="iff-story-code" hidden="">${encode(fullStoryCode)}</div>`
        );
        templates.push({
            label: asArray(config.scripts.story).join(", "),
            kind: "story code",
            source: fullStoryCode,
            isCode: true,
        });
    }

    /**
     * user global code
     */
    if (config.scripts?.global) {
        const fullGlobalCode = concatFileContents(
            projectRootPath,
            config.scripts.global
        );
        outputHTML("#iff-story-data").append(
            `<div id="iff-global-code" hidden="">${encode(
                fullGlobalCode
            )}</div>`
        );
        templates.push({
            label: asArray(config.scripts.global).join(", "),
            kind: "global code",
            source: fullGlobalCode,
            isCode: true,
        });
    }

    /**
     * user story style
     */
    if (config.styles?.story) {
        const fullStoryStyle = concatFileContents(
            projectRootPath,
            config.styles.story
        );
        outputHTML("head").append(`<style>${fullStoryStyle}</style>`);
    }

    /**
     * user scripts & styles
     */
    scriptsContents.forEach((value, key) => {
        outputHTML("#iff-story-data").append(
            `<div class="iff-author-script" data-src="${key}" hidden="">${value}</div>`
        );
        templates.push({
            label: key,
            kind: "script",
            source: decode(value),
            isCode: true,
        });
    });
    stylesContents.forEach((value, key) =>
        outputHTML("#iff-story-data").append(
            `<div class="iff-author-style" data-src="${key}" hidden="">${value}</div>`
        )
    );

    // Nothing is written unless the whole story compiles: a syntax error here
    // would otherwise reach the player as a snippet that silently fails to
    // render, possibly the very first one.
    checkTemplates(templates);

    // transitions written in code, which the markup link check cannot see
    const definedNames = new Set<string>();
    userSnippets.each((_, snippet) => {
        const name = snippet.attribs?.name;
        if (name) definedNames.add(name.trim());
    });
    checkCodeTargets(templates, definedNames);

    // Restore author code (HTML-escaped, which the engine reverses with decode())
    // only now, on the way out
    fs.writeFile(outputFilePath, unmaskCode(outputHTML.html()), (err) => {
        if (err) {
            console.error("Error writing to the output file:", err);
            return;
        }

        const shown = path.relative(process.cwd(), outputFilePath);
        console.log(
            `Rendered game saved to ${bold(
                !shown || shown.startsWith("..") ? outputFilePath : shown
            )}. Enjoy!`
        );
    });
}
