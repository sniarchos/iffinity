import yargs from "yargs";
import fs from "fs";
import { spawn } from "child_process";
import path from "path";
import * as cheerio from "cheerio";
import { readAllHtmlAndEjsFilesUnder } from "./crawler";
import { printTree } from "flexible-tree-printer";
import { green, bold, yellowBright, blue, yellow } from "ansis/colors";
import { loadConfigFile } from "./config";

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

type GraphNode = {
    data: { id: string; kind: "start" | "snippet" | "missing" };
};
type GraphEdge = { data: { source: string; target: string; broken: boolean } };
type Graph = { nodes: GraphNode[]; edges: GraphEdge[] };

function buildSnippetGraph(snippetFiles: string[]): Graph {
    const defined = new Set<string>();
    const starts = new Set<string>();
    const links: Array<[string, string]> = [];

    snippetFiles.forEach((file) => {
        const $ = cheerio.load(fs.readFileSync(file, "utf8"));
        $("snippet").each((_, snippet) => {
            const name = $(snippet).attr("name") as string;
            if (!name) return;
            defined.add(name);
            if ($(snippet).attr("start") !== undefined) starts.add(name);

            const snippetHtml = ($(snippet).html() as string) ?? "";
            const regex = /\[\[([^\]]*)\]\]/g;
            let match;
            while ((match = regex.exec(snippetHtml))) {
                const parts = match[1].split("|").map((p) => p.trim());
                // [[Name]] and [[text|Name]] are transitions; [[text||#id]] is not
                if (parts.length === 1) links.push([name, parts[0]]);
                else if (parts.length === 2) links.push([name, parts[1]]);
            }
            // transitions performed in code, declared with <iff-link>
            $(snippet)
                .find("iff-link")
                .each((_, link) => {
                    const target = $(link).text().trim();
                    if (target) links.push([name, target]);
                });
        });
    });

    const referenced = new Set(links.map(([, t]) => t));
    const missing = [...referenced].filter((t) => !defined.has(t));

    const nodes: GraphNode[] = [
        ...[...defined].map(
            (id) =>
                ({
                    data: { id, kind: starts.has(id) ? "start" : "snippet" },
                }) as GraphNode
        ),
        ...missing.map(
            (id) => ({ data: { id, kind: "missing" } }) as GraphNode
        ),
    ];

    const edges: GraphEdge[] = links.map(([source, target]) => ({
        data: { source, target, broken: !defined.has(target) },
    }));

    return { nodes, edges };
}

/**
 * Open a file with the OS default handler. Best effort: if it fails, the
 * caller has already printed the path, which is the right outcome over SSH
 * and in CI anyway.
 */
function openInDefaultApp(filePath: string): void {
    const spec: [string, string[]] =
        process.platform === "win32"
            ? ["cmd", ["/c", "start", "", filePath]]
            : process.platform === "darwin"
              ? ["open", [filePath]]
              : ["xdg-open", [filePath]];
    try {
        const child = spawn(spec[0], spec[1], {
            detached: true,
            stdio: "ignore",
        });
        child.on("error", () => undefined);
        child.unref();
    } catch {
        // path already reported
    }
}

function renderGraphPage(title: string, graph: Graph): string {
    const nSnippets = graph.nodes.filter(
        (n) => n.data.kind !== "missing"
    ).length;
    const nBroken = graph.edges.filter((e) => e.data.broken).length;
    const stats =
        nSnippets +
        " snippets &middot; " +
        graph.edges.length +
        " links" +
        (nBroken > 0 ? " &middot; " + nBroken + " broken" : "");

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} &mdash; snippet graph</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.30.2/cytoscape.min.js"></script>
<style>
  :root {
    --bg:#15181c; --panel:#1d2126; --line:#2b3138;
    --ink:#e7e9ec; --muted:#8d959e;
    --start:#d9932f; --snippet:#4f9d69; --missing:#d4574e;
  }
  *{box-sizing:border-box}
  html,body{height:100%;margin:0}
  body{
    background:var(--bg);color:var(--ink);
    font:14px/1.5 ui-sans-serif,system-ui,"Segoe UI",Roboto,sans-serif;
    display:flex;flex-direction:column;
  }
  header{
    display:flex;align-items:baseline;gap:1rem;flex-wrap:wrap;
    padding:.85rem 1.15rem;border-bottom:1px solid var(--line);background:var(--panel);
  }
  h1{margin:0;font-size:1rem;font-weight:600;letter-spacing:-.01em}
  .stats{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.78rem;color:var(--muted)}
  .legend{margin-left:auto;display:flex;gap:1rem;font-size:.78rem;color:var(--muted)}
  .legend span{display:inline-flex;align-items:center;gap:.4rem}
  .dot{width:.62rem;height:.62rem;border-radius:50%;display:inline-block}
  #cy{flex:1;min-height:0}
  footer{
    padding:.5rem 1.15rem;border-top:1px solid var(--line);
    font-size:.72rem;color:var(--muted);background:var(--panel);
  }
</style>
</head>
<body>
<header>
  <h1>${title}</h1>
  <span class="stats">${stats}</span>
  <span class="legend">
    <span><i class="dot" style="background:var(--start)"></i>start</span>
    <span><i class="dot" style="background:var(--snippet)"></i>snippet</span>
    <span><i class="dot" style="background:var(--missing)"></i>missing</span>
  </span>
</header>
<div id="cy"></div>
<footer>Drag to pan, scroll to zoom. Red nodes are linked to but never defined.</footer>
<script>
  var elements = ${JSON.stringify(graph)};
  cytoscape({
    container: document.getElementById("cy"),
    elements: elements,
    layout: { name: "cose", animate: false, padding: 40, nodeRepulsion: 12000 },
    style: [
      { selector: "node", style: {
          "background-color": "#4f9d69", label: "data(id)",
          color: "#e7e9ec", "font-size": 10,
          "font-family": "ui-monospace, monospace",
          "text-valign": "center", "text-halign": "center",
          "text-outline-color": "#15181c", "text-outline-width": 2,
          width: 18, height: 18 } },
      { selector: 'node[kind = "start"]', style: {
          "background-color": "#d9932f", width: 26, height: 26,
          "font-size": 12 } },
      { selector: 'node[kind = "missing"]', style: {
          "background-color": "#d4574e", "border-width": 2,
          "border-color": "#d4574e", "border-opacity": 0.35 } },
      { selector: "edge", style: {
          width: 1.2, "line-color": "#2b3138",
          "target-arrow-color": "#2b3138", "target-arrow-shape": "triangle",
          "arrow-scale": 0.8, "curve-style": "bezier" } },
      { selector: "edge[?broken]", style: {
          "line-color": "#d4574e", "target-arrow-color": "#d4574e",
          "line-style": "dashed" } }
    ]
  });
</script>
</body>
</html>
`;
}

function showSnippetGraph(
    snippetFiles: string[],
    title: string,
    projectRootPath: string,
    open: boolean
): void {
    const graph = buildSnippetGraph(snippetFiles);
    const outPath = path.join(projectRootPath, "snippet-graph.html");
    fs.writeFileSync(outPath, renderGraphPage(title, graph), "utf8");

    console.log(`Snippet graph written to ${bold(outPath)}`);

    const broken = graph.edges.filter((e) => e.data.broken);
    if (broken.length > 0) {
        console.warn(
            `${yellow("Warning:")} ${
                broken.length
            } link(s) point to snippets that do not exist:`
        );
        const seen = new Set<string>();
        for (const e of broken) {
            const key = `${e.data.source} -> ${e.data.target}`;
            if (seen.has(key)) continue;
            seen.add(key);
            console.warn(`  ${e.data.source} ${yellow("->")} ${e.data.target}`);
        }
    }

    if (open) openInDefaultApp(outPath);
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
    if (argv.graph)
        showSnippetGraph(
            snippetFiles,
            config.story.title,
            projectRootPath,
            argv.open !== false
        );
}
