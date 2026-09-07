import $ from "jquery";
import { Story } from "./models/Story";

declare global {
    interface Window {
        /**
         * The running story. Exposed so that authors can inspect and drive a
         * story from the browser console while developing -- `window.story.state`,
         * `window.story.showSnippet("Some Snippet")` and so on. Snippet code
         * receives `story` directly and should use that instead.
         */
        story: Story;
    }
}

$(function () {
    var story = new Story(
        $("#iff-story-data").data("title"),
        {
            name: $("#iff-story-data").data("author-name"),
            email: $("#iff-story-data").data("author-email") || undefined,
        },
        $("#iff-story-data").data("version"),
        $(".iff-snippet-data"),
        $(".iff-author-script"),
        $(".iff-author-style"),
        $("#iff-story-code").html(),
        $("#iff-global-code").html()
    );

    window.story = story;

    // HTML cleanup
    $("#iff-story-data").remove();

    story.start();
});
