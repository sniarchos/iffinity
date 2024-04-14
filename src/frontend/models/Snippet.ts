import { ISnippet } from "../interfaces/ISnippet";

export class Snippet implements ISnippet {
    id: number;
    name: string;
    tags: string[];
    start: boolean;
    source: string;
    scripts: string[];
    styles: string[];

    constructor(
        id: number,
        name: string,
        tags: string[],
        start: boolean,
        source: string,
        scripts: string[],
        styles: string[]
    ) {
        this.id = id;
        this.name = name;
        this.tags = tags;
        this.start = start;
        this.source = source;
        this.scripts = scripts;
        this.styles = styles;
    }
}
