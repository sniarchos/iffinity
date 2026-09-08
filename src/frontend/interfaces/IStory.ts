import { ISnippet } from "./ISnippet";

export type Checkpoint = {
    state: object;
    history: number[];
};

export type SaveObj = {
    state: object;
    history: number[];
    checkpoint?: Checkpoint;
};

export interface IStory {
    title: string;
    author: { name: string; email?: string };
    version: string;

    snippets: ISnippet[];
    // list of snippet ids
    history: number[];
    // user-defined global state
    state: any;
    // user-defined global functions
    funcs: any;
    checkpoint?: Checkpoint;
    // user-defined story code (runs once at the beginning of the story)
    scode?: string;
    getSnippet(id: string | number): ISnippet | undefined;
    getStartingSnippet(): ISnippet | undefined;
    renderSnippet(id: string | number, runScripts?: boolean): string;
    showSnippet(id: string | number, addToHistory?: boolean): boolean;
    onLeave(fn: () => void): void;
    start(): void;

    save(): SaveObj;
    load(
        data: SaveObj,
        cb?: () => void,
        landingSnippet?: string,
        addToHistory?: boolean
    ): void;

    createCheckpoint(): Checkpoint;
    getCheckpoint(): Checkpoint | undefined;
    restoreCheckpoint(
        restoreHistory: boolean,
        jumpToCheckpoint: boolean,
        addToHistory: boolean
    ): boolean;
}
