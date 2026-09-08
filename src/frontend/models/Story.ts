import ejs from "ejs";
import { Checkpoint, IStory, SaveObj } from "../interfaces/IStory";
import { ISnippet } from "../interfaces/ISnippet";
import { Snippet } from "./Snippet";
import { decode } from "html-entities";

export class Story implements IStory {
    title: string;
    author: { name: string; email?: string };
    version: string;
    snippets: ISnippet[];
    history: number[] = [];
    state: any = {};
    funcs: any = {};
    checkpoint?: Checkpoint = undefined;
    scode?: string;
    gcode?: string;
    authorScripts: Map<string, string> = new Map();
    authorStyles: Map<string, string> = new Map();
    /** cleanups registered by the current snippet, run when it is left */
    private leaveHandlers: Array<() => void> = [];

    constructor(
        title: string,
        author: { name: string; email?: string },
        version: string,
        snippets: JQuery<HTMLElement>,
        authorScriptsElems: JQuery<HTMLElement>,
        authorStylesElems: JQuery<HTMLElement>,
        scode?: string,
        gcode?: string
    ) {
        this.title = title;
        this.author = author;
        this.version = version;

        authorScriptsElems.each((_, e) => {
            const authorScript = $(e);
            const key = authorScript.data("src");
            const value = decode(authorScript.html());
            this.authorScripts.set(key, value);
        });

        authorStylesElems.each((_, e) => {
            const authorStyle = $(e);
            const key = authorStyle.data("src");
            const value = decode(authorStyle.html());
            this.authorStyles.set(key, value);
        });

        this.snippets = snippets
            .map((i, e) => {
                const snippet = $(e);
                snippet.attr("id", i);
                return new Snippet(
                    i,
                    snippet.data("name"),
                    snippet.data("tags")?.trim().split(/ +/) ?? [],
                    snippet.data("start") !== undefined,
                    decode(snippet.html()),
                    snippet.data("scripts") === ""
                        ? []
                        : snippet.data("scripts").trim().split(";"),
                    snippet.data("styles") === ""
                        ? []
                        : snippet.data("styles").trim().split(";")
                );
            })
            .get();

        this.scode = decode(scode);
        this.gcode = decode(gcode);
    }

    getSnippet(id: string | number): ISnippet | undefined {
        if (typeof id === "string") {
            return this.snippets.find((s) => s.name === id);
        }
        return this.snippets[id];
    }

    getStartingSnippet(): ISnippet | undefined {
        return this.snippets.find((s) => s.start);
    }

    /**
     * Render the snippet with the given id, returning the rendered HTML.
     * If the snippet is not found, an error is logged and an empty string is returned.
     *
     * The snippet is rendered using EJS, with the following exposed data:
     * - story: the story object
     * - snippet: the snippet object
     * - s: the story state object (alias for this.state)
     * - f: the story functions object (alias for this.funcs)
     *
     * @param id the id of the snippet to render (can be a string or a number)
     * @param runScripts (optional) whether to also run the global, tag- and
     * snippet-specific scripts that belong to this snippet. Off by default:
     * those scripts exist to set up a snippet the player is *looking at*, and
     * they reach for the live document, so running them for a call that only
     * asks for a string leaves the visible page changed behind your back --
     * a snippet rendered inline would, for instance, re-add whatever chrome
     * its tag scripts attach. `showSnippet` passes `true`, because that is a
     * real visit. Story code is not covered by this flag; it runs once at the
     * start of the story whatever asks for the first render.
     * @returns the rendered HTML of the snippet (or an empty string if the snippet is not found)
     */
    renderSnippet(id: string | number, runScripts = false): string {
        const snippet = this.getSnippet(id);

        if (!snippet) {
            if (typeof id === "string")
                console.error(`Error: snippet "${id}" not found in the story.`);
            else
                console.error(
                    `Error: snippet with id ${id} not found in the story.`
                );
            return "";
        }

        // render the snippet
        let exposedData = {
            story: this,
            snippet: snippet,
            s: this.state,
            f: this.funcs,
        };
        // Clear the story code *before* rendering. If this snippet renders
        // another one inline, the nested call would otherwise still see
        // `this.scode` set and execute the story code a second time.
        const scode = this.scode;
        this.scode = undefined;

        let renderedSnippetHTML = ejs.render(
            // render the {tag,script}-specific styles
            snippet.styles
                .map((s) => "<style>" + this.authorStyles.get(s) + "</style>")
                .join("\n") +
                // render the story code (only once at the beginning, if it exists)
                (scode ? "<% " + scode + "%>\n" : "") +
                // the global code runs every time a snippet is *shown*, so it
                // belongs with the scripts below rather than with the story code
                (runScripts && this.gcode ? "<% " + this.gcode + "%>\n" : "") +
                // render the {tag,script}-specific scripts
                (runScripts
                    ? snippet.scripts
                          .map((s) => "<% " + this.authorScripts.get(s) + "%>")
                          .join("\n")
                    : "") +
                snippet.source,
            exposedData
        );
        return renderedSnippetHTML;
    }

    /**
     * Show the snippet with the given id, rendering it on the `#iff-snippet` element,
     * overwriting the snippet that was already shown.
     *
     * @param id the id of the snippet to show (can be a string or a number)
     * @param addToHistory whether to add the snippet to the history (default: true)
     * @returns true if the snippet was found and shown, false otherwise
     */
    showSnippet(id: string | number, addToHistory = true): boolean {
        const snippet = this.getSnippet(id);

        if (!snippet) {
            if (typeof id === "string")
                console.error(`Error: snippet "${id}" not found in the story.`);
            else
                console.error(
                    `Error: snippet with id ${id} not found in the story.`
                );
            return false;
        }

        const leaving =
            this.history.length > 0
                ? this.getSnippet(this.history[this.history.length - 1])
                : undefined;

        // Let the outgoing snippet clean up (timers, intervals, listeners)
        // before its DOM is torn down.
        for (const fn of this.leaveHandlers) {
            try {
                fn();
            } catch (e) {
                console.error("Error in an onLeave handler:", e);
            }
        }
        this.leaveHandlers = [];
        $(window).trigger("iff:snippet:leaving", [leaving]);

        // add the snippet to the history
        if (addToHistory) this.history.push(snippet.id);

        // render the snippet ($.html() also drops data/handlers of the old DOM)
        // a real visit: the snippet's scripts belong to it
        $("#iff-snippet").html(this.renderSnippet(snippet.id, true));

        $(window).trigger("iff:snippet:shown", [snippet]);

        return true;
    }

    /**
     * Register a cleanup to run when the current snippet is left.
     * Handlers fire once, before the snippet's DOM is replaced, and are
     * then discarded. This is the place to clear timers started by a
     * snippet-specific script, e.g. `story.onLeave(() => clearInterval(t))`.
     */
    onLeave(fn: () => void) {
        this.leaveHandlers.push(fn);
    }

    start() {
        // show the starting snippet
        const startingSnippet = this.getStartingSnippet();
        if (!startingSnippet) {
            console.error("Error: no starting snippet found in the story.");
            return;
        }

        // setup the click events for all snippet links
        $("#iff-story").on("click", "a[data-snippet]", (event) => {
            const targetSnippetName = $(event.currentTarget).data("snippet");
            const targetSnippet = this.getSnippet(targetSnippetName);
            if (!targetSnippet) {
                console.error(
                    `Error: snippet "${targetSnippetName}" not found in the story.`
                );
                return false;
            }
            this.showSnippet(targetSnippet.id);
        });

        this.showSnippet(startingSnippet.id);
    }

    /**
     * Save the story state and history.
     *
     * @returns a `StoryState` object with the following properties:
     * - state: the story state (user-defined object)
     * - history: the story history (list of snippet numerical IDs)
     */
    save(): SaveObj {
        return {
            state: this.state,
            history: this.history,
            checkpoint: this.getCheckpoint(),
        };
    }

    /**
     *
     * @param data the `StoryState` to load (as returned by `save()`)
     * @param cb (optional) a callback function to call after the story state is loaded.
     * The callback function is passed the loaded `StoryState` object.
     * @param landingSnippet (optional) the snippet to show after loading the story state.
     * If this is not provided, the last snippet in the history is shown.
     * @param addToHistory (optional) whether to record the snippet shown after
     * the load (the landing snippet, or the last visited one) in the history.
     * Off by default: the restored history already ends where the player was,
     * so recording again would either duplicate that entry or write a landing
     * screen -- typically a "Load successful" snippet -- over the player's
     * actual position. Note that this parameter was called `loadNoHistory`
     * before iffinity 1.0.0, when it meant the opposite of its name.
     */
    load(
        data: SaveObj,
        cb?: (s: object) => void,
        landingSnippet?: string,
        addToHistory: boolean = false
    ) {
        this.state = data.state;
        this.history = data.history;
        this.checkpoint = data.checkpoint;

        if (cb) cb(this.state);

        if (landingSnippet) this.showSnippet(landingSnippet, addToHistory);
        else
            this.showSnippet(
                this.history[this.history.length - 1],
                addToHistory
            );
    }

    /**
     * Create a checkpoint of the story state and history.
     */
    createCheckpoint() {
        return (this.checkpoint = {
            state: JSON.parse(JSON.stringify(this.state)),
            history: [...this.history],
        } as Checkpoint);
    }

    /**
     * Get the current checkpoint or undefined if there is no checkpoint.
     */
    getCheckpoint() {
        return this.checkpoint;
    }

    /**
     * Restore the checkpoint, optionally jumping to the last visited snippet.
     *
     * @param restoreHistory whether to restore the history to the checkpoint's history (default: false)
     * @param jumpToCheckpoint whether to jump to the last visited snippet (default: true)
     * @param addToHistory whether to add the last visited snippet to the history
     * (works only if jumpToCheckpoint = true) (default: true)
     */
    restoreCheckpoint(
        restoreHistory = false,
        jumpToCheckpoint = true,
        addToHistory = true
    ) {
        if (!this.checkpoint) return false;

        this.state = JSON.parse(JSON.stringify(this.checkpoint.state));
        if (restoreHistory) this.history = [...this.checkpoint.history];

        if (jumpToCheckpoint)
            this.showSnippet(
                this.history[this.history.length - 1],
                addToHistory
            );

        return true;
    }
}
