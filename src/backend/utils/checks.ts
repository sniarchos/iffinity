import { bold, green, red, yellow } from "ansis/colors";
import { Config, asArray } from "../types/Config";
import fs from "fs";
import path from "path";
import ejs from "ejs";
import vm from "vm";
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

/** One piece of author code or markup, named so a failure can be attributed. */
export type Template = {
    /** what to call this in an error message, e.g. a snippet or file name */
    label: string;
    /** what kind of thing it is, e.g. "snippet" or "story code" */
    kind: string;
    /** the EJS source, exactly as the runtime will receive it */
    source: string;
    /** true if `source` is raw JavaScript that the runtime wraps in `<% %>` */
    isCode?: boolean;
};

/**
 * Find the line of `source` that a syntax error came from.
 *
 * Purely diagnostic: any failure here just means a less precise error.
 */
function locateSyntaxError(source: string): number | undefined {
    try {
        const template = new (ejs as any).Template(source, {});
        template.generateSource();
        const generated: string = template.source;

        let failedAt = -1;
        try {
            new vm.Script(generated);
            return undefined; // generated code is fine; the fault is elsewhere
        } catch (e) {
            const stack = String((e as Error).stack ?? "");
            const m = /evalmachine[^:]*:(\d+)/.exec(stack);
            if (!m) return undefined;
            failedAt = parseInt(m[1], 10);
        }

        // Walk back to the nearest marker and add the distance from it. A
        // template that opens with a code tag gets no marker at all -- the
        // prologue EJS adds later already sets __line to 1 -- so fall back to
        // an implicit marker sitting just above the first generated line.
        const lines = generated.split("\n");
        let base = 1;
        let markerAt = 0;
        for (let i = Math.min(failedAt, lines.length) - 1; i >= 0; i--) {
            const marker = /__line\s*=\s*(\d+)\s*$/.exec(lines[i]);
            if (marker) {
                base = parseInt(marker[1], 10);
                markerAt = i + 1;
                break;
            }
        }
        return base + (failedAt - markerAt - 1);
    } catch {
        return undefined;
    }
}

/** A few lines of context around `line`, numbered, with the culprit marked. */
function excerpt(source: string, line: number, radius = 3): string[] {
    const lines = source.split("\n");
    const from = Math.max(0, line - 1 - radius);
    const to = Math.min(lines.length, line + radius);
    const width = String(to).length;
    const out: string[] = [];
    for (let i = from; i < to; i++)
        out.push(
            `${String(i + 1).padStart(width)}${
                i === line - 1 ? " > " : " | "
            }${lines[i]}`
        );
    return out;
}

/**
 * Verify that every snippet and every piece of author code actually compiles.
 *
 * The engine compiles a snippet only when the player first reaches it, so a
 * syntax error in a rarely-visited snippet would otherwise survive the whole
 * build and surface as a blank screen mid-playthrough. Worse, an error in the
 * story code took the *first* snippet down with it, so the story would not
 * start at all -- and `ifc compile` still reported success.
 *
 * Each piece is compiled on its own (ie not glued together the way the
 * runtime does), so the error names the file the author has to open.
 */
export type TemplateFailure = {
    template: Template;
    /** the first, useful line of EJS's message */
    message: string;
    /** the offending line, when it could be pinned down */
    line?: number;
};

/** The runtime wraps a bare code file in a single EJS tag; so do we. */
function asTemplateSource(t: Template): string {
    // no newline after `<% `, so line numbers still match the author's file
    return t.isCode ? "<% " + t.source + "%>\n" : t.source;
}

/** Compile every template, returning one entry per failure. */
export function findTemplateFailures(templates: Template[]): TemplateFailure[] {
    const failures: TemplateFailure[] = [];
    for (const t of templates) {
        try {
            ejs.compile(asTemplateSource(t));
        } catch (e) {
            failures.push({
                template: t,
                message: String((e as Error).message).split("\n")[0],
                line: locateSyntaxError(asTemplateSource(t)),
            });
        }
    }
    return failures;
}

export function checkTemplates(templates: Template[]): void {
    const failures = findTemplateFailures(templates);

    if (failures.length === 0) {
        console.info(`All ${templates.length} template(s) compile`);
        return;
    }

    console.error(
        `${red("Error:")} ${failures.length} of ${
            templates.length
        } template(s) do not compile:`
    );
    for (const { template: t, message, line } of failures) {
        // a snippet's source starts after its <snippet> tag, so its lines are
        // its own, not the enclosing file's -- say which we mean
        const where = t.isCode ? "line" : "line (within the snippet)";

        console.error(
            `  in ${t.kind} ${bold(red(t.label))}` +
                (line !== undefined
                    ? `, ${where} ${bold(red(String(line)))}`
                    : "") +
                ":"
        );
        console.error(`    ${message}`);
        if (line !== undefined)
            for (const l of excerpt(t.source, line)) console.error(`    ${l}`);
    }
    console.error("Aborting.");
    process.exit(1);
}

/**
 * Verify snippet names that appear as string literals in author code.
 *
 * `checkSnippetLinks` only sees markup, so a transition written in code --
 * `story.showSnippet("Bridge")` -- goes unchecked unless the author also
 * declares it with `<iff-link>`, which is easy to forget and easier still to
 * let drift once a snippet is renamed. Reading the literals back out catches
 * the ones nobody declared.
 *
 * Only literal arguments can be checked; `story.showSnippet(dest)` is a
 * runtime decision and is counted, not flagged. This is a warning rather than
 * an error because the reference may be reached through code paths that never
 * run, and because a story is still playable with a dead branch in it.
 *
 * @returns the number of unresolved names found
 */
export function checkCodeTargets(
    templates: Template[],
    definedNames: Set<string>
): number {
    // showSnippet("X") / renderSnippet('X'), either quote style, escapes intact
    const CALL = new RegExp(
        String.raw`\b(?:showSnippet|renderSnippet)\s*\(\s*(["'])((?:\\.|(?!\1)[^\\])*)\1`,
        "g"
    );

    // target -> the templates that reference it
    const broken = new Map<string, Set<string>>();

    for (const t of templates) {
        for (const m of t.source.matchAll(CALL)) {
            const target = m[2].trim();
            if (!target || definedNames.has(target)) continue;
            // `showSnippet("Inventory/" + item)` builds its name at runtime;
            // the literal is only a prefix and means nothing on its own
            const after = t.source.slice(m.index! + m[0].length);
            if (/^\s*\+/.test(after)) continue;
            if (!broken.has(target)) broken.set(target, new Set());
            broken.get(target)!.add(t.label);
        }
    }

    if (broken.size === 0) return 0;

    const total = [...broken.values()].reduce((n, s) => n + s.size, 0);
    console.error(
        `${yellow(
            "Warning:"
        )} ${total} code reference(s) name snippets that do not exist:`
    );
    for (const [target, froms] of broken)
        console.error(
            `  ${red(target)} <- named in ${[...froms]
                .map((f) => yellow(f))
                .join(", ")}`
        );
    return total;
}
