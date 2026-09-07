import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import { bold, red, yellow } from "ansis/colors";
import { HtmlValidate, Result } from "html-validate";
import { Config } from "../types/Config";

function compileSnippetLinks(match: string, linkData: string): string {
    const parts = linkData
        .split("|")
        .map((s) => s.trim().replace(/\n+ */g, " "));
    if (parts.length === 1) {
        // case [[<snippet name>]]
        return `<a href="javascript:void(0)" data-snippet="${parts[0]}">${parts[0]}</a>`;
    } else if (parts.length === 2) {
        // case [[<text>|<snippet name>]]
        return `<a href="javascript:void(0)" data-snippet="${parts[1]}">${parts[0]}</a>`;
    } else if (parts.length === 3) {
        // case [[<snippet name>||<id/classes>]]
        if (parts[1] !== "") {
            console.error(
                `${red("Error:")} invalid syntax for snippet link ${yellow(
                    match
                )}`
            );
            console.error(
                "\tWhen providing an id for the link, it is the callback's responsibility to show"
            );
            console.error(
                "\ta different snippet via the story.showSnippet() method, if so desired."
            );
            console.error("Aborting.");
            process.exit(1);
        }
        // break second part into id(s) and class(es)
        const ids = (parts[2].match(/#[\w-]+/g) || []) as string[];
        const classes = (parts[2].match(/\.[\w-]+/g) || []) as string[];
        if (ids.length > 1) {
            console.warn(
                `${yellow("Warning:")} snippet link ${yellow(
                    match
                )} has more than one id.`
            );
            console.warn(
                `\tWill only use the first one (${bold(ids[0].slice(1))}).`
            );
        }
        // return the link
        return `<a href="javascript:void(0)" ${
            ids.length > 0 ? `id="${ids[0].slice(1)}"` : ""
        } ${
            classes.length > 0
                ? `class="${classes.map((c) => c.slice(1)).join(" ")}"`
                : ""
        }>${parts[0]}</a>`;
    } else {
        // problem raise an error
        console.error("Error parsing the input template file.");
        return "";
    }
}

function compileIdsAndClassesShorthands(
    match: string,
    tag: string,
    attributes: string
): string {
    const id = attributes.match(/#([\w-]+)/);
    const classes = attributes.match(/\.[\w-]+/g) || [];
    const attrs = [];
    if (!id && classes.length === 0) return match;
    if (id) attrs.push(`id="${id.slice(1)}"`);
    if (classes.length > 0)
        attrs.push(`class="${classes.map((c) => c.slice(1)).join(" ")}"`);
    return `<${tag} ${attrs.join(" ")}`;
}

/**
 * The `[[link]]` and `<tag#id.class>` rewrites are plain regexes over the raw
 * file. Without protection they also fire inside EJS blocks and `<script>`
 * bodies, where they silently corrupt the author's JavaScript: `i<arr.length`
 * becomes `i<arr class="length"`, and `arr[[i]]` becomes an anchor. Neither
 * raises an error; the snippet simply comes out mangled.
 *
 * So lift those regions out, rewrite what remains, and put them back.
 * Sentinels use the Unicode private use area, which cannot occur in real
 * source.
 */
const MASK_OPEN = "\uE000";
const MASK_CLOSE = "\uE001";
const MASKABLE = /<%[\s\S]*?%>|<script\b[\s\S]*?<\/script\s*>/gi;
const MASK_REF = new RegExp(MASK_OPEN + "([0-9]+)" + MASK_CLOSE, "g");

/**
 * Masked regions live here for the whole compile. They must survive not only
 * the regex rewrites but also every cheerio parse -- an HTML parser will
 * happily read `<arr.length` inside an EJS block as a tag and restructure the
 * document around it.
 */
let codeStash: string[] = [];

export function resetCodeStash(): void {
    codeStash = [];
}

function maskCode(src: string): string {
    return src.replace(MASKABLE, (match) => {
        codeStash.push(match);
        return MASK_OPEN + (codeStash.length - 1) + MASK_CLOSE;
    });
}

/**
 * Put the masked code back, HTML-escaped. Escaping matches what cheerio would
 * have produced had it parsed the code as text, and the engine reverses it
 * with `decode()` before handing the snippet to EJS -- so this works in
 * attribute positions too.
 */
export function unmaskCode(src: string): string {
    return src.replace(MASK_REF, (_m, i) => escapeAsText(codeStash[Number(i)]));
}

/**
 * Escape exactly what an HTML serializer escapes in a text node -- no more.
 * Matching it byte for byte keeps output stable, and the engine's `decode()`
 * reverses it before EJS sees the code.
 */
function escapeAsText(code: string): string {
    return code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/**
 * Apply the authoring shorthands to one file's source, leaving code untouched.
 */
export function compileAuthoringSyntax(src: string): string {
    return maskCode(src)
        .replace(/\[\[([^\]]*)\]\]/g, compileSnippetLinks)
        .replace(/<([\w-]+)([^>]*?)(?=[> ])/g, compileIdsAndClassesShorthands);
}

// attempts to resolve the path relative to the snippet file
function resolveSnippetFilePath(filePath: string, snippetPath: string): string {
    let resolvedPath = path.resolve(path.dirname(snippetPath), filePath);
    return fs.existsSync(resolvedPath) ? resolvedPath : filePath;
}

// maps the resolveSnippetFilePath function to the "scripts" and
// "styles" attributes to resolve any possibly relative paths to the snippet
function resolveSnippetFilePaths(
    snippet: cheerio.Cheerio<Element>,
    filePath: string
) {
    if (snippet.attr("scripts") !== undefined)
        snippet.attr(
            "scripts",
            snippet
                .attr("scripts")
                ?.split(";")
                .map((scriptPath) =>
                    resolveSnippetFilePath(scriptPath.trim(), filePath)
                )
                .join(";")
        );
    if (snippet.attr("styles") !== undefined)
        snippet.attr(
            "styles",
            snippet
                .attr("styles")
                ?.split(";")
                .map((stylePath) =>
                    resolveSnippetFilePath(stylePath.trim(), filePath)
                )
                .join(";")
        );
}

// search all the tree under the project root
// for any file that ends with .html or .ejs
// and parse each file to find all the snippets
async function _readAllHtmlAndEjsFilesUnder(
    dir: string
): Promise<[string[], string[]]> {
    let allContent: string[] = [];
    let snippetFiles: string[] = [];
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);

        if (fs.statSync(filePath).isDirectory()) {
            // If it's a directory, recurse into it
            const subtreeRes = await _readAllHtmlAndEjsFilesUnder(filePath);
            allContent = allContent.concat(subtreeRes[0]);
            snippetFiles = snippetFiles.concat(subtreeRes[1]);
        } else {
            // If it's a file, check the extension
            const extname = path.extname(filePath);
            if ([".html", ".htm", ".ejs"].includes(extname)) {
                const src = compileAuthoringSyntax(
                    fs.readFileSync(filePath, "utf8")
                );
                allContent.push(src);
                snippetFiles.push(filePath);
            }
        }
    }

    return [allContent, snippetFiles];
}

export async function readAllHtmlAndEjsFilesUnder(
    dir: string,
    config: Config
): Promise<[string, string[]]> {
    const [allContent, snippetFiles] = await _readAllHtmlAndEjsFilesUnder(dir);

    // build the HTML validator
    const valrules: Record<string, any> = {
        "element-name": ["error", { whitelist: ["snippet"] }],
        "void-style": "off", // for self-closing tags
        "no-raw-characters": "off", // for ejs tags
        "no-inline-style": "off", // too restrictive
    };

    if (config.validation)
        for (const [key, val] of Object.entries(config.validation))
            valrules[key] = val;

    const htmlvalidator = new HtmlValidate({
        extends: ["html-validate:recommended"],
        rules: valrules,
    });

    // validate all the HTML files
    // defer check for invalid HTML files for later
    // in order to filter out the output HTML
    // (or any HTML that has no snippets in it)
    const invalidHtmlFileIDs = new Map<number, Result[]>();
    for (let i = 0; i < allContent.length; i++) {
        const valres = await htmlvalidator.validateString(allContent[i]);
        if (!valres.valid) invalidHtmlFileIDs.set(i, valres.results);
    }

    let processedContent = "";
    const processedSnippetFiles = [];
    let foundInvalidSrcHTML = false;
    for (let i = 0; i < snippetFiles.length; i++) {
        const src = allContent[i];
        const filePath = snippetFiles[i];
        const $ = cheerio.load(src, null, false);
        if ($("snippet").length === 0) continue;
        if (invalidHtmlFileIDs.has(i)) {
            console.error(
                `${red("Error:")} invalid HTML in ${yellow(filePath)}`
            );
            for (const res of invalidHtmlFileIDs.get(i)!) {
                for (const msg of res.messages)
                    console.error(
                        `\t${msg.line}:${msg.column} ${msg.message}` +
                            (msg.ruleUrl
                                ? ` (See ${msg.ruleUrl} for more info)`
                                : ` (${msg.ruleId}})`)
                    );
            }
            foundInvalidSrcHTML = true;
        }
        $("snippet").each((_, snippet) =>
            resolveSnippetFilePaths($(snippet), filePath)
        );
        processedContent += "\n" + $.html();
        processedSnippetFiles.push(filePath);
    }

    if (foundInvalidSrcHTML) {
        console.error("Aborting.");
        process.exit(1);
    }

    return [processedContent, processedSnippetFiles];
}
