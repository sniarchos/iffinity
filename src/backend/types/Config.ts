import fs from "fs";
import path from "path";

export type StringOrStringArray = string | string[];

export function asArray(value: StringOrStringArray): string[] {
    if (Array.isArray(value)) {
        return value;
    } else {
        return [value];
    }
}

export function concatFileContents(
    projectRootPath: string,
    filelist: StringOrStringArray
): string {
    return asArray(filelist).reduce(
        (acc, script) =>
            acc +
            fs.readFileSync(path.join(projectRootPath, script), "utf8") +
            "\n",
        ""
    );
}

export type TagRule = {
    rule: string;
    files: StringOrStringArray;
};

export type Config = {
    story: {
        title: string;
        author: {
            name: string;
            email?: string;
        };
        version: string;
        repository?: { type: string; url: string };
    };

    libraries?: {
        scripts?: StringOrStringArray;
        styles?: StringOrStringArray;
    };

    scripts?: {
        story?: StringOrStringArray;
        global?: StringOrStringArray;
        tags?: TagRule[];
    };

    styles?: {
        story?: StringOrStringArray;
        tags?: TagRule[];
    };

    /**
     * Treat links that point at non-existent snippets as an error rather than
     * a warning. Off by default so that a half-written story still compiles.
     */
    strictLinks?: boolean;

    validation?: Record<string, any>;
};
