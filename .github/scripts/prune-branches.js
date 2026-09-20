// Invoked from .github/workflows/branch-pruning.yml via actions/github-script:
//   const run = require('./.github/scripts/prune-branches.js');
//   await run({ github, context, core });

const ARCHIVE_AFTER_DAYS = 60;
const DELETE_AFTER_DAYS = 30; // days after archiving
const PROTECTED = new Set(['main', 'develop']);

function daysSince(dateStr) {
  const ms = Date.now() - new Date(dateStr).getTime();
  return ms / (1000 * 60 * 60 * 24);
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

module.exports = async ({ github, context, core }) => {
  const owner = context.repo.owner;
  const repo = context.repo.repo;

  async function listAllBranches() {
    return github.paginate(github.rest.repos.listBranches, { owner, repo, per_page: 100 });
  }

  async function listOpenPrHeadRefs() {
    const prs = await github.paginate(github.rest.pulls.list, { owner, repo, state: 'open', per_page: 100 });
    return new Set(prs.map(pr => pr.head.ref));
  }

  async function getLastCommitDate(sha) {
    const { data } = await github.rest.repos.getCommit({ owner, repo, ref: sha });
    return data.commit.committer.date || data.commit.author.date;
  }

  async function archiveBranch(branch) {
    const name = branch.name;
    const sha = branch.commit.sha;
    const stamp = todayStamp();
    const tagName = `archive/${name}-${stamp}`;
    const archivedRef = `archived/${name}`;

    core.info(`Archiving "${name}" (inactive 60+ days) -> tag "${tagName}", branch "${archivedRef}"`);

    const { data: tagObj } = await github.rest.git.createTag({
      owner, repo,
      tag: tagName,
      message: `Archived branch ${name} (inactive ${ARCHIVE_AFTER_DAYS}+ days) on ${new Date().toISOString()}`,
      object: sha,
      type: 'commit'
    });
    await github.rest.git.createRef({ owner, repo, ref: `refs/tags/${tagName}`, sha: tagObj.sha });

    try {
      await github.rest.git.createRef({ owner, repo, ref: `refs/heads/${archivedRef}`, sha });
    } catch (e) {
      if (e.status !== 422) throw e; // ref already exists — fall through to still delete the source branch
      core.warning(`"${archivedRef}" already exists, skipping creation`);
    }

    await github.rest.git.deleteRef({ owner, repo, ref: `heads/${name}` });
  }

  async function listArchiveTagsByOriginalName() {
    const tags = await github.paginate(github.rest.repos.listTags, { owner, repo, per_page: 100 });
    const map = new Map();
    const pattern = /^archive\/(.+)-(\d{8})$/;
    for (const t of tags) {
      const m = t.name.match(pattern);
      if (!m) continue;
      const [, originalName, stamp] = m;
      if (!map.has(originalName)) map.set(originalName, []);
      map.get(originalName).push({ tag: t.name, stamp });
    }
    return map;
  }

  async function maybeDeleteArchived(branch, tagsByOriginalName) {
    const originalName = branch.name.replace(/^archived\//, '');
    const candidates = tagsByOriginalName.get(originalName) || [];
    if (candidates.length === 0) {
      core.warning(`No archive tag found for "${branch.name}", leaving it alone`);
      return;
    }
    // Most recent archive tag by embedded date suffix.
    candidates.sort((a, b) => b.stamp.localeCompare(a.stamp));
    const latest = candidates[0];
    const archivedDate = `${latest.stamp.slice(0, 4)}-${latest.stamp.slice(4, 6)}-${latest.stamp.slice(6, 8)}`;
    const age = daysSince(archivedDate);
    if (age >= DELETE_AFTER_DAYS) {
      core.info(`Deleting "${branch.name}" — archived ${Math.floor(age)} days ago. Tag "${latest.tag}" remains.`);
      await github.rest.git.deleteRef({ owner, repo, ref: `heads/${branch.name}` });
    } else {
      core.info(`"${branch.name}" archived ${Math.floor(age)} days ago, not yet eligible for deletion (needs ${DELETE_AFTER_DAYS})`);
    }
  }

  const [branches, protectedHeadRefs] = await Promise.all([listAllBranches(), listOpenPrHeadRefs()]);

  const toArchive = [];
  const alreadyArchived = [];

  for (const branch of branches) {
    if (PROTECTED.has(branch.name)) continue;
    if (protectedHeadRefs.has(branch.name)) continue;

    if (branch.name.startsWith('archived/')) {
      alreadyArchived.push(branch);
      continue;
    }

    const lastCommitDate = await getLastCommitDate(branch.commit.sha);
    if (daysSince(lastCommitDate) >= ARCHIVE_AFTER_DAYS) {
      toArchive.push(branch);
    }
  }

  for (const branch of toArchive) {
    await archiveBranch(branch);
  }

  if (alreadyArchived.length > 0) {
    const tagsByOriginalName = await listArchiveTagsByOriginalName();
    for (const branch of alreadyArchived) {
      await maybeDeleteArchived(branch, tagsByOriginalName);
    }
  }

  core.info(`Done. Archived ${toArchive.length} branch(es); checked ${alreadyArchived.length} previously archived branch(es) for deletion.`);
};
