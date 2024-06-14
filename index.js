const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
    try {
        // Get the inputs
        const token = core.getInput('token');
        const label_map_input = core.getInput('label_map');

        // Parse the label map input as JSON
        const label_map = JSON.parse(label_map_input);

        // Create a new octokit instance
        const octokit = github.getOctokit(token);

        // Get the PR number from the GitHub context
        const pr_number = github.context.issue.number;

        // Get the PR title
        const { data: pullRequest } = await octokit.rest.pulls.get({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            pull_number: pr_number
        });
        const pr_title = pullRequest.title;

        // Check the PR title for a key from the label map
        for (const key in label_map) {
            // Create a regular expression to match the key followed by a parenthesis with a random number of characters and a colon
            const regex = new RegExp(`^${key}(\\([^\\)]*\\))?:.*$`);

            if (regex.test(pr_title)) {
                const label = label_map[key];
                console.log(`Label to add: ${label}`);

                // Add the label to the PR
                await octokit.rest.issues.addLabels({
                    owner: github.context.repo.owner,
                    repo: github.context.repo.repo,
                    issue_number: pr_number,
                    labels: [label]
                });

                // Break the loop after finding the first match
                break;
            }
        }
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
