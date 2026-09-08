import path from "path";

/**
 * Write a path the way the rest of the world writes paths.
 *
 * `path.relative` and friends hand back backslashes on Windows, and some of
 * those paths end up in the compiled HTML as keys (`data-src`, `data-scripts`).
 * Left alone, the same project compiled on Windows and on Linux produces
 * different output for no reason anyone can see. Forward slashes are the
 * canonical form everywhere in iffinity.
 */
export function toPosix(p: string): string {
    return p.split(path.sep).join("/");
}

/** `path.relative`, in canonical form. */
export function relativePosix(from: string, to: string): string {
    return toPosix(path.relative(from, to));
}
