import test from 'node:test';
import assert from 'node:assert';
import config from '../src/config.js';
import { NotificationManager } from '../src/managers/notification-manager.js';
import { StatsManager } from '../src/managers/stats-manager.js';

test('Config carica correttamente le variabili da .env', () => {
  assert.strictEqual(config.cpuPercentage, 25);
  assert.strictEqual(config.pushoverReportDays, 3);
  assert.ok(config.pushoverUserKey.length > 0);
  assert.ok(config.pushoverApiToken.length > 0);
});

test('StatsManager salva e ripristina lastReportTime correttamente', () => {
  const stats = new StatsManager();
  const testTime = Date.now() - 100_000;
  stats.setLastReportTime(testTime);

  const serialized = stats.serialize();
  assert.strictEqual(serialized.lastReportTime, testTime);

  const newStats = new StatsManager();
  newStats.restore(serialized);
  assert.strictEqual(newStats.lastReportTime, testTime);
});

test('NotificationManager si inizializza con Pushover abilitato', () => {
  const notify = new NotificationManager();
  assert.strictEqual(notify._pushoverEnabled, true);
});
