const { test, describe } = require('node:test');
const assert = require('node:assert');

describe('Node.js Built-in Test Runner', () => {
  test('should pass a basic test', () => {
    assert.strictEqual(1 + 1, 2);
  });

  test('should verify string equality', () => {
    assert.strictEqual('hello', 'hello');
  });

  test('should test database loading', () => {
    const database = require('../src/config/database');
    assert.ok(database);
    assert.ok(typeof database.getAllUsers === 'function');
  });
});
