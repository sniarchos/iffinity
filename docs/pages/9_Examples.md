---
title: Examples
layout: default
permalink: /examples/
nav_order: 9
---

# {{ page.title }}

Here, you can play around with the examples that come with iffinity.

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Code</th>
            <th>Demo</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><strong>An Example Story</strong></td>
            <td>The standard simple example that comes with iffinity's <code>ifc init</code> command.</td>
            <td><a href="https://github.com/sniarchos/iffinity/tree/HEAD/examples/simple">Code</a></td>
            <td><a href="{{ site.baseurl }}/examples/simple/">Demo</a></td>
        </tr>
        <tr>
            <td><strong>Three Snippets</strong></td>
            <td>A more complex example, with multiple snippets, tags, scripts and styles.</td>
            <td><a href="https://github.com/sniarchos/iffinity/tree/HEAD/examples/convoluted">Code</a></td>
            <td><a href="{{ site.baseurl }}/examples/convoluted/">Demo</a></td>
        </tr>
        <tr>
            <td><strong>multfiles</strong></td>
            <td>
                An example demonstrating how to use multiple scripts in your project,
                including a convoluted utilization of the tag system.
            </td>
            <td><a href="https://github.com/sniarchos/iffinity/tree/HEAD/examples/multfiles">Code</a></td>
            <td><a href="{{ site.baseurl }}/examples/multfiles/">Demo</a></td>
        </tr>
        <tr>
            <td><strong>Lifecycle</strong></td>
            <td>
                Demonstrates the snippet lifecycle events and
                <code>story.onLeave()</code>. A snippet starts a timer, hands
                the engine its cleanup, and the next snippet checks at runtime
                that the timer actually stopped.
            </td>
            <td><a href="https://github.com/sniarchos/iffinity/tree/HEAD/examples/lifecycle">Code</a></td>
            <td><a href="{{ site.baseurl }}/examples/lifecycle/">Demo</a></td>
        </tr>
        <tr>
            <td><strong>linebreak</strong></td>
            <td>
                An example used to test the linebreaks that may be introduced
                (e.g. by your editor) in the snippet links.
            </td>
            <td><a href="https://github.com/sniarchos/iffinity/tree/HEAD/examples/linebreak">Code</a></td>
            <td><a href="{{ site.baseurl }}/examples/linebreak/">Demo</a></td>
        </tr>
    </tbody>
</table>
