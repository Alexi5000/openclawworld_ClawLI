import assert from 'node:assert/strict';
import { test } from 'node:test';
import { webcrypto } from 'node:crypto';
import { ensureUserId } from '../client/src/userId.js';

function storage(initial) {
  const data = new Map(initial ? [['clawland_user_id', initial]] : []);
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}

test('existing identities survive without requiring new entropy', () => {
  const store = storage('legacy-user-identity');
  assert.equal(ensureUserId(store, {}), 'legacy-user-identity');
  assert.equal(store.getItem('clawland_user_id'), 'legacy-user-identity');
});

test('UUID support creates one persistent identity', () => {
  const store = storage();
  let calls = 0;
  const crypto = { randomUUID() { calls++; return '80624a31-872f-4d2f-a6e8-4dca9ce70f93'; } };
  const first = ensureUserId(store, crypto);
  assert.equal(first, '80624a31-872f-4d2f-a6e8-4dca9ce70f93');
  assert.equal(ensureUserId(store, crypto), first);
  assert.equal(calls, 1);
});

test('browsers without randomUUID use 128 bits of secure randomness', () => {
  const store = storage();
  let calls = 0;
  const crypto = { getRandomValues(bytes) {
    calls++;
    assert.equal(bytes.length, 16);
    bytes.set(Array.from({ length: 16 }, (_, i) => i));
    return bytes;
  } };
  assert.equal(ensureUserId(store, crypto), 'u_000102030405060708090a0b0c0d0e0f');
  assert.equal(ensureUserId(store, crypto), 'u_000102030405060708090a0b0c0d0e0f');
  assert.equal(calls, 1);
});

test('real Web Crypto fallback produces distinct opaque IDs', () => {
  const crypto = { getRandomValues: bytes => webcrypto.getRandomValues(bytes) };
  const first = ensureUserId(storage(), crypto);
  const second = ensureUserId(storage(), crypto);
  assert.match(first, /^u_[0-9a-f]{32}$/);
  assert.match(second, /^u_[0-9a-f]{32}$/);
  assert.notEqual(first, second);
});

test('missing or failed entropy never persists a predictable identity', () => {
  for (const crypto of [{}, undefined, { getRandomValues() { throw new Error('entropy failure'); } }]) {
    const store = storage();
    const candidate = crypto ?? null;
    assert.throws(() => ensureUserId(store, candidate));
    assert.equal(store.getItem('clawland_user_id'), null);
  }
});
