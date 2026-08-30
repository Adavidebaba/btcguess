/**
 * Wallet data loader — versione server-side.
 * Carica bloom filter, wallet table e stats da filesystem
 * invece che via HTTP fetch (come fa la versione browser).
 *
 * Il ciclo caldo usa una Map esatta hash160 → saldo.
 * Bloom e tabella restano disponibili per compatibilità e verifica.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BloomFilter } from './bloom.js';
import { WalletTable } from './wallet-table.js';
import config from '../config.js';

const HEADER_BYTES = 8;
const ENTRY_BYTES = 28;
const HASH160_BYTES = 20;

let _bloom = null;
let _table = null;
let _stats = null;
let _walletMap = null;

function hash160Key(h160) {
  return Buffer.from(h160).toString('hex');
}

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

export function loadTable() {
  if (_table) return _table;
  const tablePath = resolve(config.dataDir, 'satoshi-wallets.bin');
  const buf = readFileSync(tablePath);
  _table = new WalletTable(new Uint8Array(buf));
  return _table;
}

function readU64LE(bytes, offset) {
  let value = 0n;
  for (let i = 7; i >= 0; i--) {
    value = (value << 8n) | BigInt(bytes[offset + i]);
  }
  return value;
}

/**
 * Carica una Map esatta hash160Hex → balanceSats.
 * Una sola volta per processo/worker; lookup O(1) senza falsi positivi.
 */
export function loadWalletMap() {
  if (_walletMap) return _walletMap;

  const table = loadTable();
  const bytes = table.bytes;
  const map = new Map();

  for (let i = 0; i < table.count; i++) {
    const off = HEADER_BYTES + i * ENTRY_BYTES;
    const hash160 = bytes.subarray(off, off + HASH160_BYTES);
    map.set(hash160Key(hash160), readU64LE(bytes, off + HASH160_BYTES));
  }

  _walletMap = map;
  return _walletMap;
}


/**
 * Probe candidate hash160s. Returns the first {hash160, balanceSats}
 * presente nella Map esatta, o null.
 */
export function checkHash160s(candidates) {
  const walletMap = loadWalletMap();
  for (const h of candidates) {
    const balanceSats = walletMap.get(hash160Key(h));
    if (balanceSats !== undefined) {
      return { hash160: h, balanceSats };
    }
  }
  return null;
}
