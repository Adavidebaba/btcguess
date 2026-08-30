import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import {
  checkHash160s,
  loadBloom,
  loadStats,
  loadTable,
  loadWalletMap,
} from '../src/game/wallets.js';

const HEADER_BYTES = 8;
const ENTRY_BYTES = 28;
const HASH160_BYTES = 20;

function tableEntry(table, index) {
  const off = HEADER_BYTES + index * ENTRY_BYTES;
  const hash160 = table.bytes.subarray(off, off + HASH160_BYTES);
  return { hash160, balanceSats: table.lookup(hash160) };
}

test('la Map esatta coincide con tabella e stats su tutti i wallet', () => {
  const stats = loadStats();
  const table = loadTable();
  const walletMap = loadWalletMap();

  assert.equal(table.count, stats.walletCount);
  assert.equal(walletMap.size, stats.walletCount);

  for (let i = 0; i < table.count; i++) {
    const { hash160, balanceSats } = tableEntry(table, i);
    const hit = checkHash160s([hash160]);
    assert.ok(hit, `wallet ${i} deve essere trovato`);
    assert.equal(hit.balanceSats, balanceSats);
    assert.equal(Buffer.compare(hit.hash160, hash160), 0);
  }
});

test('checkHash160s ignora i non-match e restituisce il primo saldo esatto', () => {
  const table = loadTable();
  const first = tableEntry(table, 0);
  const last = tableEntry(table, table.count - 1);
  const miss = randomBytes(20);

  assert.equal(checkHash160s([miss]), null);

  const hit = checkHash160s([miss, last.hash160, first.hash160]);
  assert.ok(hit);
  assert.equal(hit.balanceSats, last.balanceSats);
  assert.equal(Buffer.compare(hit.hash160, last.hash160), 0);
});

test('il Bloom resta coerente con la tabella (nessun falso negativo)', () => {
  const bloom = loadBloom();
  const table = loadTable();

  for (let i = 0; i < table.count; i++) {
    const { hash160 } = tableEntry(table, i);
    assert.equal(bloom.has(hash160), true);
  }
});
