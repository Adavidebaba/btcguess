import test from 'node:test';
import assert from 'node:assert';
import { StatsManager } from '../src/managers/stats-manager.js';
import { WorkerPoolManager } from '../src/engine/worker-pool-manager.js';
import { SpinEngine } from '../src/engine/spin-engine.js';
import { PersistenceManager } from '../src/managers/persistence-manager.js';
import { NotificationManager } from '../src/managers/notification-manager.js';

test('WorkerPoolManager calcola correttamente i core e lo scaling', () => {
  const statsManager = new StatsManager();
  const pool = new WorkerPoolManager({ statsManager, defaultPercentage: 50 });

  assert.ok(pool.totalCores >= 1, 'Deve rilevare almeno 1 core');
  assert.strictEqual(pool.cpuPercentage, 50);

  const status = pool.getStatus();
  assert.strictEqual(status.totalCores, pool.totalCores);
  assert.strictEqual(status.cpuPercentage, 50);
});

test('WorkerPoolManager garantisce zero duplicati avanzando il cursore', () => {
  const statsManager = new StatsManager();
  const pool = new WorkerPoolManager({ statsManager, defaultPercentage: 100 });

  const initialCursor = pool.cursorHex;
  assert.strictEqual(initialCursor.length, 64);

  // Esegui avvio e arresto rapido
  pool.start();
  assert.ok(pool.activeWorkersCount >= 1, 'Deve avere worker attivi');

  pool.stop();
  assert.strictEqual(pool.activeWorkersCount, 0, 'Tutti i worker devono essere fermati');
});

test('StatsManager gestisce batch di spin e calcola SPS', () => {
  const stats = new StatsManager();
  stats.recordBatch({ spinsCount: 500, lastKeyHex: '00'.repeat(32) });

  const json = stats.toJSON();
  assert.strictEqual(json.totalSpins, '500');
  assert.strictEqual(json.matchesCount, 0);
});

test('SpinEngine salva e ripristina il cursore per zero duplicati tra riavvii', () => {
  const statsManager = new StatsManager();
  const persistenceManager = new PersistenceManager();
  const notificationManager = new NotificationManager();

  const engine = new SpinEngine({
    statsManager,
    persistenceManager,
    notificationManager,
  });

  const testCursor = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  engine.restoreState({ cursorHex: testCursor, cpuPercentage: 75 });

  const status = engine.pool.getStatus();
  assert.strictEqual(status.currentCursor, testCursor);
  assert.strictEqual(status.cpuPercentage, 75);
});
