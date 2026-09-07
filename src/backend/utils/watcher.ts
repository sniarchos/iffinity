import fs from "fs";
import path from "path";
import yargs from "yargs";
import { bold, dim, green, red, yellow } from "ansis/colors";

/** Directories that never contain story sources. */
const IGNORED_DIRS = new Set([
    "node_modules",
    ".git",
    "dist",
    ".test-build",
    ".vscode",
]);

/** Extensions worth recompiling for. */
const WATCHED_EXTENSIONS = new Set([
    ".html",
    ".htm",
    ".ejs",
    ".js",
    ".css",
    ".json",
]);

function isInteresting(filename: string | null): boolean {
    if (!filename) return false;
    const parts = filename.split(/[\\/]/);
    if (parts.some((p) => IGNORED_DIRS.has(p))) return false;
    // the compiler's own output must not retrigger the compiler
    if (path.extname(filename) === ".html" && parts.length === 1) return false;
    return WATCHED_EXTENSIONS.has(path.extname(filename));
}

function timestamp(): string {
    return new Date().toLocaleTimeString();
}

/**
 * Recompile the project whenever a source file changes.
 *
 * Compiling by hand after every edit gets old fast on a project with hundreds
 * of snippets. This is deliberately dependency-free: `fs.watch` with a short
 * debounce, which is enough for an author's edit-save-reload loop.
 */
export async function watchProject(argv: yargs.Arguments): Promise<void> {
    const projectRootPath = (argv.projectRoot as string) || process.cwd();
    const delay = Number(argv.debounce ?? 150);

    let compiling = false;
    let queued = false;

    async function build(reason: string): Promise<void> {
        if (compiling) {
            queued = true;
            return;
        }
        compiling = true;
        console.log();
        console.log(dim(`[${timestamp()}]`) + ` ${reason}`);
        try {
            const compiler = await import("./compiler");
            await compiler.compileProject(argv);
        } catch (e) {
            // A failed build must not kill the watcher; the author will fix
            // the file and save again.
            console.error(`${red("Build failed:")} ${(e as Error).message}`);
        }
        compiling = false;
        if (queued) {
            queued = false;
            await build("rebuilding (changes arrived during the last build)");
        }
    }

    let timer: NodeJS.Timeout | undefined;
    function schedule(filename: string): void {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => build(`changed: ${bold(filename)}`), delay);
    }

    let watcher: fs.FSWatcher;
    try {
        watcher = fs.watch(
            projectRootPath,
            { recursive: true },
            (_event, filename) => {
                if (isInteresting(filename)) schedule(filename as string);
            }
        );
    } catch (e) {
        console.error(
            `${red("Error:")} could not watch ${yellow(projectRootPath)}: ${
                (e as Error).message
            }`
        );
        process.exit(1);
    }

    console.log(`Watching ${bold(projectRootPath)} for changes.`);
    console.log(dim("Press Ctrl+C to stop."));

    await build("initial build");

    const stop = () => {
        watcher.close();
        console.log();
        console.log(green("Stopped watching."));
        process.exit(0);
    };
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);

    // keep the process alive
    await new Promise<void>(() => undefined);
}
