import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import { encode } from "html-entities";

/**
 * Does 2 things (similar to tags/parseTagsScriptsAndStyles):
 * 1. Creates 2 lists of scripts and styles filenames
 *    from the snippet's data attributes and replaces
 *    the respective data attributes with these 2 lists.
 * 2. Creates 2 maps (one for scripts and one for styles)
 *    with the content of the files in the lists, so that
 *    they can be used by the frontend for "lazy" appending
 *    of the scripts and styles to the snippets.
 *
 * @returns a tuple with 2 maps: one for scripts and one for styles
 *          from the filenames to the file contents.
 */
export function parseSnippetCodeAndStyle(
    snippetDataElem: cheerio.Cheerio<Element>,
    projectRootPath: string
): [Map<string, string>, Map<string, string>] {
    const updatedScriptsAttribute = [];
    const updatedStylesAttribute = [];
    const snippetScripts = new Map<string, string>();
    const snippetStyles = new Map<string, string>();

    const snippetCodeFiles =
        (snippetDataElem.data("scripts") as string)?.split(";") || [];
    if (snippetCodeFiles.length > 0) {
        for (const snippetCodeFile of snippetCodeFiles) {
            const resolvedSnippetCodeFile = path.isAbsolute(snippetCodeFile)
                ? snippetCodeFile
                : path.join(projectRootPath, snippetCodeFile.trim());
            const snippetCodeContent = fs.readFileSync(
                resolvedSnippetCodeFile,
                "utf8"
            );
            const relFilePath = path.relative(
                projectRootPath,
                resolvedSnippetCodeFile
            );
            updatedScriptsAttribute.push(relFilePath);
            snippetScripts.set(relFilePath, encode(snippetCodeContent));
        }
    }

    const snippetStyleFiles =
        (snippetDataElem.data("styles") as string)?.split(";") || [];
    if (snippetStyleFiles.length > 0) {
        for (const snippetStyleFile of snippetStyleFiles) {
            const resolvedSnippetStyleFile = path.isAbsolute(snippetStyleFile)
                ? snippetStyleFile
                : path.join(projectRootPath, snippetStyleFile.trim());
            const snippetStyleContent = fs.readFileSync(
                resolvedSnippetStyleFile,
                "utf8"
            );
            const relFilePath = path.relative(
                projectRootPath,
                resolvedSnippetStyleFile
            );
            updatedStylesAttribute.push(relFilePath);
            snippetStyles.set(relFilePath, encode(snippetStyleContent));
        }
    }

    const allScripts = snippetDataElem.attr("data-all-scripts") as string;
    snippetDataElem.attr(
        "data-all-scripts",
        (allScripts ? allScripts + ";" : "") + updatedScriptsAttribute.join(";")
    );

    const allStyles = snippetDataElem.attr("data-all-styles") as string;
    snippetDataElem.attr(
        "data-all-styles",
        (allStyles ? allStyles + ";" : "") + updatedStylesAttribute.join(";")
    );

    return [snippetScripts, snippetStyles];
}
