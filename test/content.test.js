const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { parseViewCount } = require('../youtube-rotblock-content.js');

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
