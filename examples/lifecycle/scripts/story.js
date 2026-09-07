/***
 * Story code runs exactly once, at the very beginning of the story.
 *
 * Counting the runs here is not busywork: if a snippet renders another
 * snippet inline (this example's "Start" does), a naive engine would run the
 * story code a second time for the nested render. The counter below makes
 * that visible.
 */
s.storyCodeRuns = (s.storyCodeRuns || 0) + 1;

s.ticks = 0;
s.eventLog = [];

/***
 * The engine fires two events on `window` around every snippet change:
 *
 *   iff:snippet:leaving  - before the outgoing snippet's DOM is replaced
 *   iff:snippet:shown    - after the incoming snippet has been rendered
 *
 * Both hand you the snippet object in question. Registering here (rather than
 * in global code) means the handlers are bound once for the whole story.
 */
$(window).on("iff:snippet:leaving", function (_event, snippet) {
    s.eventLog.push("leaving: " + (snippet ? snippet.name : "(nothing)"));
});

$(window).on("iff:snippet:shown", function (_event, snippet) {
    s.eventLog.push("shown:   " + snippet.name);
});
