/**
 * Wallet data loader — versione server-side.
 * Carica bloom filter, wallet table e stats da filesystem
 * invece che via HTTP fetch (come fa la versione browser).
 * 
 * Riutilizza BloomFilter e WalletTable dalla repo originale senza modifiche.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BloomFilter } from './bloom.js';
import { WalletTable } from './wallet-table.js';
import config from '../config.js';

let _bloom = null;
let _table = null;
let _stats = null;

export function loadBloom() {
  if (_bloom) return _bloom;
  const bloomPath = resolve(config.dataDir, 'satoshi-bloom.bin');
  const buf = readFileSync(bloomPath);
  _bloom = BloomFilter.deserialize(new Uint8Array(buf));
  return _bloom;
}

export function loadStats() {
  if (_stats) return _stats;
  const statsPath = resolve(config.dataDir, 'wallet-stats.json');
  _stats = JSON.parse(readFileSync(statsPath, 'utf8'));
  return _stats;
}

function loadTable() {
  if (_table) return _table;
  const tablePath = resolve(config.dataDir, 'satoshi-wallets.bin');
  const buf = readFileSync(tablePath);
  _table = new WalletTable(new Uint8Array(buf));
  return _table;
}

/**
 * Probe candidate hash160s. Returns the first {hash160, balanceSats}
 * that survives both the Bloom filter and the sorted-table confirmation,
 * or null. Versione sincrona per il server (tutto in memoria).
 */
export function checkHash160s(candidates) {
  const bloom = loadBloom();
  const hits = [];
  for (const h of candidates) {
    if (bloom.has(h)) hits.push(h);
  }
  if (hits.length === 0) return null;

  const tbl = loadTable();
  for (const h of hits) {
    const balanceSats = tbl.lookup(h);
    if (balanceSats !== null) {
      return { hash160: h, balanceSats };
    }
  }
  return null;
}
