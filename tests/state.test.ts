import { test, describe } from "node:test";
import assert from "node:assert";
import { Story } from "../src/frontend/models/Story";

// Enough of a Story for load() and the checkpoint methods. The real
// constructor needs a DOM, so skip it and stub out navigation.
function bareStory(state: any) {
    const story = Object.create(Story.prototype) as Story;
    story.state = state;
    story.history = [0];
    story.checkpoint = undefined;
    (story as any).showSnippet = () => true;
    return story;
}

const saveOf = (state: any) => ({ state, history: [0], checkpoint: undefined });

describe("state identity: load()", () => {
    test("keeps the same state object", () => {
        const s: any = { rels: { Grace: [0, 4] }, TL: "PT" };
        const story = bareStory(s);
        story.load(saveOf({ rels: { Grace: [2, 4] }, TL: "ST" }));
        assert.strictEqual(story.state, s);
        assert.deepStrictEqual(s, { rels: { Grace: [2, 4] }, TL: "ST" });
    });

    test("a helper that closed over s works on the loaded state", () => {
        const s: any = { count: 0 };
        const story = bareStory(s);
        // what a helper defined in the story script does
        const bump = () => {
            s.count++;
        };
        story.load(saveOf({ count: 10 }));
        bump();
        assert.strictEqual(story.state.count, 11);
    });

    test("removes keys the save does not have", () => {
        const s: any = { a: 1, onlyInThisRun: true };
        const story = bareStory(s);
        story.load(saveOf({ a: 2 }));
        assert.deepStrictEqual(s, { a: 2 });
    });

    test("loading the live state onto itself changes nothing", () => {
        const s: any = { a: 1 };
        const story = bareStory(s);
        story.load(saveOf(s));
        assert.deepStrictEqual(s, { a: 1 });
    });
});

describe("state identity: checkpoints", () => {
    test("restoreCheckpoint() keeps the same state object", () => {
        const s: any = { hp: 10 };
        const story = bareStory(s);
        story.createCheckpoint();
        s.hp = 3;
        story.restoreCheckpoint();
        assert.strictEqual(story.state, s);
        assert.strictEqual(s.hp, 10);
    });

    test("the checkpoint is not aliased to the live state", () => {
        const s: any = { hp: 10 };
        const story = bareStory(s);
        story.createCheckpoint();
        story.restoreCheckpoint();
        s.hp = 1;
        story.restoreCheckpoint();
        assert.strictEqual(s.hp, 10);
    });
});
