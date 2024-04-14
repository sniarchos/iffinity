import yargs from "yargs";
import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import { readAllHtmlAndEjsFilesUnder } from "./crawler";
import { printTree } from "flexible-tree-printer";
import { green, bold, yellowBright, blue, yellow } from "ansis/colors";
import { loadConfigFile } from "./config";
import puppeteer from "puppeteer";

function str2list(str: string | undefined): string | undefined {
    return str?.trim().split(/ +/).join(", ");
}

function printRootNode(thing: string, title: string, root: string): void {
    console.log(
        [
            `${thing} in project ${bold(title)}`,
            `(files relative to project root: ${root})`,
            "|",
        ].join("\n")
    );
}

function printSnippetNode({ nodePrefix, node, levelX }: any): void {
    let name = node.name as string;
    if (levelX === 2) {
        name = green(bold(name));
        name = name.replace("[START]", blue(bold("[START]")));
    } else if (["tags", "scripts", "styles"].includes(name.split(":")[0])) {
        const elems = name.split(": ")[1].split(", ");
        name = name.split(":")[0] + ": ";
        if (name.startsWith("tags"))
            name += elems.map((elem) => yellow(bold(elem))).join(", ");
        else name += elems.map((elem) => yellowBright(elem)).join(", ");
    }
    console.log(nodePrefix.join("") + name);
}

function printTagNode({ nodePrefix, node, levelX }: any): void {
    let name = node.name as string;
    if (levelX === 1) name = yellow(bold(name));
    else if (levelX === 2) {
        const parts = name.split(" (");
        name = green(bold(parts[0])) + " (" + parts[1];
    }
    console.log(nodePrefix.join("") + name);
}

function showAllSnippets(
    snippetFiles: string[],
    title: string,
    rootDir: string
): void {
    const tree: any = {};

    snippetFiles
        .map((file) => path.relative(rootDir, file))
        .forEach((file) => {
            tree[file] = {};
            const $ = cheerio.load(
                fs.readFileSync(path.join(rootDir, file), "utf8")
            );
            $("snippet").each((_, snippet) => {
                const name = $(snippet).attr("name");
                const tags = str2list($(snippet).attr("tags"));
                const scripts = str2list($(snippet).attr("scripts"));
                const styles = str2list($(snippet).attr("styles"));
                const start = $(snippet).attr("start") !== undefined;
                const sname = name + (start ? " [START] " : "");
                tree[file][sname] = {};
                if (tags) tree[file][sname][`tags: ${tags}`] = {};
                if (scripts) tree[file][sname][`scripts: ${scripts}`] = {};
                if (styles) tree[file][sname][`styles: ${styles}`] = {};
            });
        });

    // remove all empty files from tree
    for (const file in tree) {
        if (Object.keys(tree[file]).length === 0) delete tree[file];
    }

    if (Object.keys(tree).length === 0) {
        console.log(`No snippets found in project ${bold(title)}`);
        return;
    }

    printTree({
        parentNode: tree,
        printNode: printSnippetNode,
        printRootNode: () => printRootNode("Snippets", title, rootDir),
    });
}

function showAllTags(
    snippetFiles: string[],
    title: string,
    rootDir: string
): void {
    const tree: any = {};

    snippetFiles.forEach((file) => {
        const $ = cheerio.load(fs.readFileSync(file, "utf8"));
        $("snippet").each((_, snippet) => {
            const name = $(snippet).attr("name");
            const tags = $(snippet).attr("tags");
            if (tags === undefined) return;
            tags.split(/ +/).forEach((tag) => {
                if (tree[tag] === undefined) tree[tag] = {};
                tree[tag][`${name} (${path.relative(rootDir, file)})`] = {};
            });
        });
    });

    if (Object.keys(tree).length === 0) {
        console.log(`No tags found in project ${bold(title)}`);
        return;
    }

    printTree({
        parentNode: tree,
        printNode: printTagNode,
        printRootNode: () => printRootNode("Tags", title, rootDir),
    });
}

function buildSnippetGraph(snippetFiles: string[]): any {
    const graph: any = {
        nodes: [],
        edges: [],
    };

    snippetFiles.forEach((file) => {
        const $ = cheerio.load(fs.readFileSync(file, "utf8"));
        $("snippet").each((_, snippet) => {
            const name = $(snippet).attr("name") as string;
            const snippetHtml = $(snippet).html() as string;
            const linkedSnippets = [];
            const regex = /\[\[([^\]]*)\]\]/g;
            let match;
            while ((match = regex.exec(snippetHtml))) {
                const parts = match[1].split("|");
                if (parts.length === 1) {
                    // case [[<snippet name>]]
                    linkedSnippets.push(parts[0]);
                } else if (parts.length === 2) {
                    // case [[<text>|<snippet name>]]
                    linkedSnippets.push(parts[1]);
                }
                // case [[<text>|<snippet name>|<id>]] is not supported
                // case [[<text>||<id>]] is indecisive whether it is a link or not
            }
            // also search for <iff-link> elements inside the snippet
            $(snippet)
                .find("iff-link")
                .each((_, link) => {
                    const linkedSnippet = $(link).text();
                    if (linkedSnippet) linkedSnippets.push(linkedSnippet);
                });

            graph.nodes.push({
                data: {
                    id: name,
                    color:
                        $(snippet).attr("start") !== undefined
                            ? "blue"
                            : "green",
                },
            });

            linkedSnippets.forEach((linkedSnippet) => {
                graph.edges.push({
                    data: {
                        source: name,
                        target: linkedSnippet,
                    },
                });
            });
        });
    });

    return graph;
}

async function showSnippetGraph(snippetFiles: string[]) {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.pages().then((pages) => pages[0]);

    await page.setViewport({
        width: await page.evaluate(() => window.screen.width),
        height: await page.evaluate(() => window.screen.height),
    });

    // Define your graph data
    const graphData = buildSnippetGraph(snippetFiles);

    // Load Cytoscape.js and set up the graph
    await page.setContent(`
          <html>
            <head>
                <script src="https://unpkg.com/weaverjs@1.2.0/dist/weaver.min.js"></script>
                <script src="https://unpkg.com/cytoscape/dist/cytoscape.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/cytoscape-spread@3.0.0/cytoscape-spread.min.js"></script>
                <style>
                    body {
                        font-family: helvetica;
                        font-size: 14px;
                    }

                    #cy {
                        width: 100%;
                        height: 100%;
                        position: absolute;
                        left: 0;
                        top: 0;
                        z-index: 999;
                    }

                    h1 {
                        opacity: 0.5;
                        font-size: 1em;
                    }
                </style>
            </head>
            <body>
              <div id="cy"></div>
            </body>
          </html>
        `);

    // Draw your graph when the page is ready
    await page.evaluate((graphData) => {
        //@ts-ignore
        const cy = cytoscape({
            container: document.getElementById("cy"),
            elements: graphData,
            style: [
                {
                    selector: "node",
                    style: {
                        "background-color": "data(color)",
                        label: "data(id)",
                    },
                },
                {
                    selector: "edge",
                    style: {
                        width: 3,
                        "line-color": "#ccc",
                        "target-arrow-color": "#ccc",
                        "target-arrow-shape": "triangle",
                        "curve-style": "bezier",
                    },
                },
            ],
        });
    }, graphData);
}

export async function showProjectDetails(argv: yargs.Arguments): Promise<void> {
    const projectRootPath = (argv.projectRoot as string) || process.cwd();
    const config = loadConfigFile(argv, true, false);

    const [_, snippetFiles] = await readAllHtmlAndEjsFilesUnder(
        projectRootPath,
        config
    );

    // option -s
    if (argv.snippets) {
        showAllSnippets(snippetFiles, config.story.title, projectRootPath);
        if (argv.tags) console.log();
    }

    // option -t
    if (argv.tags)
        showAllTags(snippetFiles, config.story.title, projectRootPath);

    // option -g
    if (argv.graph) await showSnippetGraph(snippetFiles);
}
