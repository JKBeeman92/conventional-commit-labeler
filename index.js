const core = require('@actions/core');
const github = require('@actions/github');

// Built-in defaults covering all standard conventional commit types.
// Users can override individual entries or add new types via the label_map input.
const DEFAULT_LABEL_MAP = {
  feat:     'Feature',
  fix:      'Bugfix',
  docs:     'Documentation',
  chore:    'Chore',
  refactor: 'Refactor',
  test:     'Test',
  style:    'Style',
  ci:       'CI',
  perf:     'Performance',
  build:    'Build',
  revert:   'Revert'
};

// Parses the user-supplied label_map input and merges it with the built-in
// defaults. An empty / omitted input means "use all defaults as-is". Throws
// on invalid JSON or a non-object payload.
function buildLabelMap(labelMapInput) {
  let userLabelMap = {};
  if (labelMapInput && labelMapInput.trim() !== '' && labelMapInput.trim() !== '{}') {
    const parsed = JSON.parse(labelMapInput);
    if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
      throw new TypeError('label_map must be a JSON object (e.g. {"feat": "Feature"})');
    }
    userLabelMap = parsed;
  }
  return { ...DEFAULT_LABEL_MAP, ...userLabelMap };
}

// Determines which labels a PR title matches.
// Supports: type: ..., type(scope): ..., type!: ..., type!(scope): ...,
// and the Conventional Commits spec's own type(scope)!: breaking-change form.
// Matching is case-insensitive.
function matchLabels(labelMap, prTitle) {
  const labelsToApply = [];
  for (const [key, label] of Object.entries(labelMap)) {
    const pattern = new RegExp(`^${key}!?(\\([^)]*\\))?!?:.*$`, 'i');
    if (pattern.test(prTitle)) {
      labelsToApply.push(label);
    }
  }
  return labelsToApply;
}

// Labels this action manages that are on the PR but no longer match the title.
function computeStaleLabels(existingLabelNames, labelMap, labelsToApply) {
  const allMappedLabels = Object.values(labelMap);
  return existingLabelNames.filter(
    name => allMappedLabels.includes(name) && !labelsToApply.includes(name)
  );
}

async function run() {
  try {
    const token = core.getInput('token', { required: true });
    const labelMapInput = core.getInput('label_map');

    let labelMap;
    try {
      labelMap = buildLabelMap(labelMapInput);
    } catch (e) {
      core.setFailed(`Invalid label_map JSON: ${e.message}`);
      return;
    }
    core.debug(`Effective label map: ${JSON.stringify(labelMap)}`);

    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;
    const prNumber = github.context.issue.number;

    // Fetch the PR to get its title and current labels.
    const { data: pullRequest } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber
    });

    const prTitle = pullRequest.title.trim();
    core.info(`PR #${prNumber} title: "${prTitle}"`);

    const existingLabelNames = pullRequest.labels.map(l => l.name);
    core.debug(`Existing labels on PR: ${existingLabelNames.join(', ') || 'none'}`);

    const labelsToApply = matchLabels(labelMap, prTitle);
    core.info(`Labels to apply: ${labelsToApply.join(', ') || 'none'}`);

    // Remove stale labels: labels this action manages that no longer match.
    const staleLabels = computeStaleLabels(existingLabelNames, labelMap, labelsToApply);
    for (const name of staleLabels) {
      core.info(`Removing stale label: "${name}"`);
      await octokit.rest.issues.removeLabel({
        owner,
        repo,
        issue_number: prNumber,
        name
      });
    }

    // Ensure every label-to-apply actually exists in the repo; create it if not.
    for (const name of labelsToApply) {
      try {
        await octokit.rest.issues.getLabel({ owner, repo, name });
        core.debug(`Label "${name}" already exists in repo`);
      } catch (e) {
        if (e.status === 404) {
          core.info(`Label "${name}" not found — creating it`);
          await octokit.rest.issues.createLabel({
            owner,
            repo,
            name,
            color: 'ededed'
          });
        } else {
          throw e;
        }
      }
    }

    // Add labels that aren't already on the PR (idempotent).
    const labelsToAdd = labelsToApply.filter(name => !existingLabelNames.includes(name));
    if (labelsToAdd.length > 0) {
      core.info(`Adding labels: ${labelsToAdd.join(', ')}`);
      await octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number: prNumber,
        labels: labelsToAdd
      });
    } else {
      core.info('Labels are already up to date — nothing to add');
    }

  } catch (error) {
    core.setFailed(error.message);
  }
}

if (require.main === module) {
  run();
}

module.exports = { DEFAULT_LABEL_MAP, buildLabelMap, matchLabels, computeStaleLabels, run };
