import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveAll } from '../src/game/crypto.js';
import {
  IncrementalDeriver,
  SECP256K1_N,
  bigIntToBytes,
  bytesToBigInt,
} from '../src/game/incremental-derive.js';

function keyFromInt(value) {
  const bytes = new Uint8Array(32);
  bigIntToBytes(value, bytes);
  return bytes;
}

function assertSameDerivation(actual, expected, label) {
  assert.equal(
    Buffer.compare(actual.hash160Compressed, expected.hash160Compressed),
    0,
    `${label}: hash160 compressed diverso`
  );
  assert.equal(
    Buffer.compare(actual.hash160Uncompressed, expected.hash160Uncompressed),
    0,
    `${label}: hash160 uncompressed diverso`
  );
  assert.equal(
    Buffer.compare(actual.pubCompressed, expected.pubCompressed),
    0,
    `${label}: pubkey compressed diversa`
  );
  assert.equal(
    Buffer.compare(actual.pubUncompressed, expected.pubUncompressed),
    0,
    `${label}: pubkey uncompressed diversa`
  );
}

test('derivazione incrementale coincide con deriveAll su 2000 chiavi consecutive', () => {
  const keyBytes = keyFromInt(1n);
  const deriver = new IncrementalDeriver(keyBytes, 1);

  for (let i = 1; i <= 2000; i++) {
    const expected = deriveAll(Uint8Array.from(keyBytes));
    assertSameDerivation(deriver.current(), expected, `chiave ${i}`);
    deriver.next();
  }
});

test('striding con step=8 coincide con deriveAll', () => {
  const start = 123456789n;
  const keyBytes = keyFromInt(start);
  const deriver = new IncrementalDeriver(keyBytes, 8);

  for (let i = 0; i < 256; i++) {
    const expectedKey = start + BigInt(i * 8);
    const expected = deriveAll(keyFromInt(expectedKey));
    assertSameDerivation(deriver.current(), expected, `stride ${i}`);
    assert.equal(bytesToBigInt(keyBytes), expectedKey);
    deriver.next();
  }
});

test('wrap modulo n: da n-2 con step 3 torna a 1 e resta corretto', () => {
  const keyBytes = keyFromInt(SECP256K1_N - 2n);
  const deriver = new IncrementalDeriver(keyBytes, 3);

  assertSameDerivation(deriver.current(), deriveAll(keyFromInt(SECP256K1_N - 2n)), 'n-2');
  deriver.next();
  assert.equal(bytesToBigInt(keyBytes), 1n);
  assertSameDerivation(deriver.current(), deriveAll(keyFromInt(1n)), 'wrap a 1');
});

test('setStep cambia il delta e resta equivalente a deriveAll', () => {
  const keyBytes = keyFromInt(50n);
  const deriver = new IncrementalDeriver(keyBytes, 2);
  deriver.next();
  deriver.setStep(5);
  deriver.next();

  assert.equal(bytesToBigInt(keyBytes), 57n);
  assertSameDerivation(deriver.current(), deriveAll(keyFromInt(57n)), 'dopo setStep');
});
