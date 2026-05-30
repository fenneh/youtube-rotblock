const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { parseViewCount, parseDurationText, hasBlockedKeyword } = require('../youtube-rotblock-content.js');

describe('parseViewCount', () => {
  test('returns null for falsy input', () => {
    assert.equal(parseViewCount(null), null);
    assert.equal(parseViewCount(''), null);
    assert.equal(parseViewCount(undefined), null);
  });

  test('returns null when no digits found', () => {
    assert.equal(parseViewCount('LIVE'), null);
    assert.equal(parseViewCount('watching'), null);
  });

  test('plain numbers', () => {
    assert.equal(parseViewCount('500 views'), 500);
    assert.equal(parseViewCount('1,234 views'), 1234);
    assert.equal(parseViewCount('1,234,567 views'), 1234567);
  });

  test('K suffix', () => {
    assert.equal(parseViewCount('10K views'), 10000);
    assert.equal(parseViewCount('1.5K views'), 1500);
    assert.equal(parseViewCount('5k views'), 5000);
  });

  test('M suffix', () => {
    assert.equal(parseViewCount('2M views'), 2000000);
    assert.equal(parseViewCount('2.5M views'), 2500000);
    assert.equal(parseViewCount('1.5m watching'), 1500000);
  });

  test('B suffix', () => {
    assert.equal(parseViewCount('1B'), 1000000000);
    assert.equal(parseViewCount('1.23B views'), 1230000000);
  });
});

describe('parseDurationText', () => {
  test('returns null for falsy input', () => {
    assert.equal(parseDurationText(null), null);
    assert.equal(parseDurationText(''), null);
    assert.equal(parseDurationText(undefined), null);
  });

  test('returns null for LIVE', () => {
    assert.equal(parseDurationText('LIVE'), null);
  });

  test('mm:ss format', () => {
    assert.equal(parseDurationText('1:00'), 60);
    assert.equal(parseDurationText('10:30'), 630);
    assert.equal(parseDurationText('0:45'), 45);
  });

  test('hh:mm:ss format', () => {
    assert.equal(parseDurationText('1:00:00'), 3600);
    assert.equal(parseDurationText('1:30:00'), 5400);
    assert.equal(parseDurationText('2:15:30'), 8130);
  });
});

describe('hasBlockedKeyword', () => {
  test('returns false when no keywords provided', () => {
    assert.equal(hasBlockedKeyword('some video title', ''), false);
    assert.equal(hasBlockedKeyword('some video title', null), false);
    assert.equal(hasBlockedKeyword('some video title', undefined), false);
  });

  test('matches a blocked keyword', () => {
    assert.equal(hasBlockedKeyword('my reaction video', 'reaction'), true);
  });

  test('matching is case-insensitive', () => {
    assert.equal(hasBlockedKeyword('My REACTION Video', 'reaction'), true);
    assert.equal(hasBlockedKeyword('my reaction video', 'REACTION'), true);
  });

  test('returns false when title does not match any keyword', () => {
    assert.equal(hasBlockedKeyword('cool documentary', 'reaction\nprank'), false);
  });

  test('matches any keyword from a newline-separated list', () => {
    assert.equal(hasBlockedKeyword('epic prank gone wrong', 'reaction\nprank'), true);
  });

  test('ignores blank lines in keyword list', () => {
    assert.equal(hasBlockedKeyword('cool video', '\n\n\n'), false);
    assert.equal(hasBlockedKeyword('cool video', '  \n  \n'), false);
  });
});
