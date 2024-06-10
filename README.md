# PR Labeler

This action adds a label to the PR based on the title. It checks the PR title for a key from a provided label map and if it finds a match, it adds the corresponding value as a label to the PR.

## Inputs

### `token`

**Required** The `GITHUB_TOKEN` secret.

### `label_map`

The map of prefix values to label values. This should be a JSON string. Default is `'{"feat": "Feature", "fix": "Bugfix", "docs": "Documentation"}'`.

## Example usage

```yaml
- name: PR Labeler
  uses: your-github-username/your-repository-name@v1
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    label_map: '{"feat": "Feature", "fix": "Bugfix", "docs": "Documentation"}'
