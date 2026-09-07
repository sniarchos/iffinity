import path from "path";
import os from "os";
import fs from "fs";
import readline from "readline";

export async function initializeProject() {
    const projectRootPath = process.cwd();

    // create a config file, similar to npm init
    let storyTitle = path.basename(projectRootPath);
    let authorName = os.userInfo().username;
    let version = "1.0.0";

    console.log(
        "This utility will walk you through creating an iff-config.json file."
    );
    console.log('It only covers the (required) "story" section of the file.');
    console.log();
    console.log(
        "See https://sniarchos.github.io/iffinity/ for definitive documentation"
    );
    console.log("on all possible fields and exactly what they do.");
    console.log();
    console.log(
        "It is recommended to use the `ifc edit` command to change the config file later on."
    );
    console.log("Run `ifc edit --help` for more information.");
    console.log();
    console.log("Press ^C at any time to quit.");
    console.log();

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    storyTitle = await new Promise((resolve) => {
        rl.question(`story title: (${storyTitle}) `, (answer) =>
            resolve(answer || storyTitle)
        );
    });

    authorName = await new Promise((resolve) => {
        rl.question(`author name: (${authorName}) `, (answer) =>
            resolve(answer || authorName)
        );
    });

    const authorEmail = (await new Promise((resolve) => {
        rl.question("author email: ", (answer) => resolve(answer || undefined));
    })) as string | undefined;

    version = await new Promise((resolve) => {
        rl.question(`version: (${version}) `, (answer) =>
            resolve(answer || version)
        );
    });

    const repository = (await new Promise((resolve) => {
        rl.question("git repository: ", (answer) =>
            resolve(answer || undefined)
        );
    })) as string | undefined;

    const configFileContents = {
        story: {
            title: storyTitle,
            author: {
                name: authorName,
                email: authorEmail,
            },
            version: version,
            repository: repository
                ? {
                      type: "git",
                      url: repository,
                  }
                : undefined,
        },
    };

    const writeConfig = await new Promise((resolve) => {
        rl.question(
            `About to write the following config file to ${projectRootPath}/iff-config.json:\n\n${JSON.stringify(
                configFileContents,
                null,
                4
            )}\n\nIs this ok? (yes) `,
            (answer) => resolve(answer !== "no")
        );
    });

    if (writeConfig)
        fs.writeFileSync(
            path.join(projectRootPath, "iff-config.json"),
            JSON.stringify(configFileContents, null, 4) + "\n"
        );
    else console.log("Aborted.");

    if (writeConfig) {
        const createExample = await new Promise((resolve) => {
            rl.question("Create a template project? (yes) ", (answer) =>
                resolve(answer !== "no")
            );
        });

        if (createExample)
            fs.writeFileSync(
                path.join(projectRootPath, "example.ejs"),
                '<snippet name="Start" start>\n' +
                    "    <% if (!s.WEALTH) s.WEALTH = 'poor'; %>\n\n" +
                    "    <p>You are at the Start.</p>\n" +
                    "    <p>Before you lies the [[Land of Opportunity]].</p>\n" +
                    "    <br/>" +
                    "    <p>You are <strong><%= s.WEALTH %></strong>.</p>\n" +
                    "</snippet>\n" +
                    "\n" +
                    '<snippet name="Land of Opportunity">\n' +
                    "    <%\n" +
                    "       $(function() {  // never forget that when accessing the DOM!\n" +
                    '           $(".back").on("click", function() {\n' +
                    "               s.WEALTH = $(this).attr('id');\n" +
                    "               story.showSnippet('Start');\n" +
                    "           });\n" +
                    "       });\n" +
                    "    %>\n\n" +
                    "    <p>You are at the Land of Opportunity.</p>\n" +
                    "    <p>Go back [[rich||#rich.back]] or go back [[poor||#poor.back]]?</p>\n" +
                    "    <p>(or [[just go back|Start]] as you are...)</p>\n" +
                    "</snippet>\n"
            );
        console.log(
            "Done. You can now run `ifc` (or `ifc compile`) to compile your project."
        );
    }

    rl.close();
}
