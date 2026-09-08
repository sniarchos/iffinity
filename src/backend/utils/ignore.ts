import path from "path";

/**
 * Directories that never hold story sources.
 */
export const IGNORED_DIRS = new Set([
    "node_modules",
    ".git",
    "dist",
    ".test-build",
    ".vscode",
]);

/**
 * Translate one exclude pattern into a regular expression.
 *
 * Supports the three wildcards an author actually reaches for: `?` for a
 * single character, `*` for a run of characters within one path segment, and
 * `**` for a run that may cross segment boundaries. Everything else is
 * matched literally.
 */
function patternToRegExp(pattern: string): RegExp {
    let out = "";
    for (let i = 0; i < pattern.length; i++) {
        const c = pattern[i];
        if (c === "*") {
            if (pattern[i + 1] === "*") {
                out += ".*";
                i++;
            } else {
                out += "[^/]*";
            }
        } else if (c === "?") {
            out += "[^/]";
        } else if ("\\^$.|+()[]{}".includes(c)) {
            out += "\\" + c;
        } else {
            out += c;
        }
    }
    return new RegExp("^" + out + "$");
}

/**
 * Decide which paths the compiler should not read.
 *
 * Patterns are matched against the path relative to the project root, written
 * with forward slashes. A pattern also excludes everything beneath what it
 * matches, so `drafts` is enough to drop `drafts/act-one.ejs`.
 */
export class Excluder {
    private readonly rootDir: string;
    private readonly patterns: RegExp[];

    constructor(rootDir: string, patterns: string[] = []) {
        this.rootDir = rootDir;
        this.patterns = patterns
            .map((p) => p.trim().replace(/\\/g, "/").replace(/^\.\//, ""))
            .filter((p) => p.length > 0)
            .map((p) => patternToRegExp(p.replace(/\/+$/, "")));
    }

    // The path relative to the project root, in POSIX form
    private relative(absPath: string): string {
        return path.relative(this.rootDir, absPath).replace(/\\/g, "/");
    }

    // True if this directory should not be descended into
    excludesDir(absPath: string): boolean {
        if (IGNORED_DIRS.has(path.basename(absPath))) return true;
        return this.matches(this.relative(absPath));
    }

    // True if this file should not be read
    excludesFile(absPath: string): boolean {
        return this.matches(this.relative(absPath));
    }

    private matches(rel: string): boolean {
        if (rel === "" || rel.startsWith("../")) return false;
        // a pattern that matches any ancestor excludes everything below it
        const segments = rel.split("/");
        for (let i = segments.length; i > 0; i--) {
            const prefix = segments.slice(0, i).join("/");
            if (this.patterns.some((re) => re.test(prefix))) return true;
        }
        return false;
    }

    get isEmpty(): boolean {
        return this.patterns.length === 0;
    }
}
