const assert = require('assert');
const {
  friendlyDomain,
  getGroupingKey,
  stripTitleNoise,
  cleanTitle,
  smartTitle
} = require('../extension/utils/domain');

// A simple test runner
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function runTest(name, testFn) {
  testsRun++;
  try {
    testFn();
    testsPassed++;
    console.log(`✅ PASS: ${name}`);
  } catch (error) {
    testsFailed++;
    console.error(`❌ FAIL: ${name}`);
    console.error(`   ${error.message}`);
  }
}

console.log('Running domain.js unit tests...\n');

// --- Tests for friendlyDomain ---
runTest('friendlyDomain: should handle known domains', () => {
  assert.strictEqual(friendlyDomain('github.com'), 'GitHub');
  assert.strictEqual(friendlyDomain('www.youtube.com'), 'YouTube');
});

runTest('friendlyDomain: should handle substack domains', () => {
  assert.strictEqual(friendlyDomain('newsletter.substack.com'), 'Newsletter\'s Substack');
});

runTest('friendlyDomain: should handle github.io domains', () => {
  assert.strictEqual(friendlyDomain('username.github.io'), 'Username (GitHub Pages)');
});

runTest('friendlyDomain: should capitalize unknown domains', () => {
  assert.strictEqual(friendlyDomain('www.example.com'), 'Example');
  assert.strictEqual(friendlyDomain('some-site.co.uk'), 'Some-site');
  assert.strictEqual(friendlyDomain('blog.mysite.org'), 'Blog Mysite');
});

// --- Tests for getGroupingKey ---
runTest('getGroupingKey: should return full hostname in hostname mode', () => {
  assert.strictEqual(getGroupingKey('play.google.com', 'hostname'), 'play.google.com');
  assert.strictEqual(getGroupingKey('maps.google.com', 'hostname'), 'maps.google.com');
});

runTest('getGroupingKey: should extract base domain for typical domains', () => {
  assert.strictEqual(getGroupingKey('play.google.com', 'domain'), 'google.com');
  assert.strictEqual(getGroupingKey('foo.bar.example.org', 'domain'), 'example.org');
});

runTest('getGroupingKey: should handle common second-level domains', () => {
  assert.strictEqual(getGroupingKey('news.bbc.co.uk', 'domain'), 'bbc.co.uk');
  assert.strictEqual(getGroupingKey('store.apple.com.au', 'domain'), 'apple.com.au');
});

runTest('getGroupingKey: should return hostname if it has few parts', () => {
  assert.strictEqual(getGroupingKey('localhost', 'domain'), 'localhost');
  assert.strictEqual(getGroupingKey('example.com', 'domain'), 'example.com');
});

// --- Tests for stripTitleNoise ---
runTest('stripTitleNoise: should remove notification counts', () => {
  assert.strictEqual(stripTitleNoise('(2) New Messages'), 'New Messages');
  assert.strictEqual(stripTitleNoise('(10+) Notifications'), 'Notifications');
});

runTest('stripTitleNoise: should remove inline counts', () => {
  assert.strictEqual(stripTitleNoise('Inbox (5) - Mail'), 'Inbox - Mail');
});

runTest('stripTitleNoise: should clean up X/Twitter titles', () => {
  assert.strictEqual(stripTitleNoise('User on X: "Hello world" / X'), 'User: "Hello world"');
});

// --- Tests for cleanTitle ---
runTest('cleanTitle: should remove redundant domain suffixes', () => {
  assert.strictEqual(cleanTitle('My Repo - GitHub', 'github.com'), 'My Repo');
  assert.strictEqual(cleanTitle('Search Results - Google', 'www.google.com'), 'Search Results');
});

runTest('cleanTitle: should keep short titles intact', () => {
  assert.strictEqual(cleanTitle('Dog - Google', 'google.com'), 'Dog - Google'); // 'Dog' < 5 chars
});

// --- Tests for smartTitle ---
runTest('smartTitle: should format GitHub issues and PRs', () => {
  assert.strictEqual(smartTitle('https://github.com/owner/repo/issues/42', 'https://github.com/owner/repo/issues/42'), 'owner/repo Issue #42');
  assert.strictEqual(smartTitle('https://github.com/owner/repo/pull/10', 'https://github.com/owner/repo/pull/10'), 'owner/repo PR #10');
});

runTest('smartTitle: should format X/Twitter posts', () => {
  assert.strictEqual(smartTitle('https://x.com/user/status/12345', 'https://x.com/user/status/12345'), 'Post by @user');
});

// Print summary
console.log('\n--- Test Summary ---');
console.log(`Total:  ${testsRun}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);

if (testsFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
