const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_LABEL_MAP,
  buildLabelMap,
  matchLabels,
  computeStaleLabels
} = require('./index');

test('buildLabelMap returns defaults when input is empty', () => {
  assert.deepEqual(buildLabelMap(''), DEFAULT_LABEL_MAP);
  assert.deepEqual(buildLabelMap('{}'), DEFAULT_LABEL_MAP);
  assert.deepEqual(buildLabelMap(undefined), DEFAULT_LABEL_MAP);
});

test('buildLabelMap overrides one default and keeps the rest', () => {
  const map = buildLabelMap('{"feat": "Enhancement"}');
  assert.equal(map.feat, 'Enhancement');
  assert.equal(map.fix, 'Bugfix');
});

test('buildLabelMap can add a custom type', () => {
  const map = buildLabelMap('{"security": "Security Fix"}');
  assert.equal(map.security, 'Security Fix');
  assert.equal(map.feat, 'Feature');
});

test('buildLabelMap throws on invalid JSON', () => {
  assert.throws(() => buildLabelMap('not json'), SyntaxError);
});

test('buildLabelMap throws on non-object JSON', () => {
  assert.throws(() => buildLabelMap('["feat"]'), TypeError);
  assert.throws(() => buildLabelMap('"feat"'), TypeError);
  assert.throws(() => buildLabelMap('null'), TypeError);
});

test('matchLabels matches a plain conventional commit type', () => {
  assert.deepEqual(matchLabels(DEFAULT_LABEL_MAP, 'feat: add new widget'), ['Feature']);
});

test('matchLabels matches with a scope', () => {
  assert.deepEqual(matchLabels(DEFAULT_LABEL_MAP, 'fix(parser): handle empty input'), ['Bugfix']);
});

test('matchLabels matches a breaking-change marker', () => {
  assert.deepEqual(matchLabels(DEFAULT_LABEL_MAP, 'feat!: drop support for node 12'), ['Feature']);
});

test('matchLabels matches a breaking-change marker with a scope', () => {
  assert.deepEqual(matchLabels(DEFAULT_LABEL_MAP, 'feat!(api): remove v1 endpoints'), ['Feature']);
});

test('matchLabels is case-insensitive', () => {
  assert.deepEqual(matchLabels(DEFAULT_LABEL_MAP, 'FEAT: shout about it'), ['Feature']);
});

test('matchLabels returns nothing for a non-conventional title', () => {
  assert.deepEqual(matchLabels(DEFAULT_LABEL_MAP, 'Add new widget'), []);
});

test('matchLabels can match multiple keys against overlapping map entries', () => {
  const map = { feat: 'Feature', feature: 'Feature-Alt' };
  const matched = matchLabels(map, 'feat: add thing');
  assert.deepEqual(matched, ['Feature']);
});

test('computeStaleLabels finds a managed label that no longer matches', () => {
  const labelMap = DEFAULT_LABEL_MAP;
  const stale = computeStaleLabels(['Bugfix', 'help-wanted'], labelMap, ['Feature']);
  assert.deepEqual(stale, ['Bugfix']);
});

test('computeStaleLabels ignores labels this action does not manage', () => {
  const labelMap = DEFAULT_LABEL_MAP;
  const stale = computeStaleLabels(['help-wanted', 'good-first-issue'], labelMap, ['Feature']);
  assert.deepEqual(stale, []);
});

test('computeStaleLabels keeps labels that still match', () => {
  const labelMap = DEFAULT_LABEL_MAP;
  const stale = computeStaleLabels(['Feature'], labelMap, ['Feature']);
  assert.deepEqual(stale, []);
});
