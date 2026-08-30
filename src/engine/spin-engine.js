/**
 * Motore di spin coordinatore multi-thread.
 * Gestisce il ciclo di vita del WorkerPoolManager, la persistenza e le notifiche.
 */
import { WorkerPoolManager } from './worker-pool-manager.js';
import config from '../config.js';

export class SpinEngine {
  constructor({ statsManager, persistenceManager, notificationManager }) {
    this._stats = statsManager;
    this._persist = persistenceManager;
    this._notify = notificationManager;
    this._running = false;
    this._persistTimer = null;
    this._logTimer = null;
    this._testMatchDone = false;

    this._pool = new WorkerPoolManager({
      statsManager: this._stats,
      defaultPercentage: config.cpuPercentage,
      delayMs: config.spinDelayMs,
      onMatch: (matchData) => this._handleMatch(matchData),
    });

    this._stats.setPoolStatus(this._pool.getStatus());
  }

  get pool() {
    return this._pool;
  }

  /** Ripristina stato da file */
  restoreState(savedState) {
    if (!savedState) return;
    if (savedState.cursorHex) {
      this._pool.setCursorHex(savedState.cursorHex);
    }
    if (savedState.cpuPercentage) {
      this._pool.setCpuPercentage(savedState.cpuPercentage);
    }
    this._stats.setPoolStatus(this._pool.getStatus());
  }

  /** Avvia il motore e il pool di worker */
  start() {
    if (this._running) return;
    this._running = true;

    this._pool.start();
    this._stats.setPoolStatus(this._pool.getStatus());

    // Salvataggio periodico su disco e controllo report
    this._persistTimer = setInterval(() => {
      this._persistState();
      this._checkPeriodicReport();
    }, config.persistIntervalSec * 1000);

    // Log periodico su console
    this._logTimer = setInterval(() => {
      this._logStatus();
    }, config.statsLogIntervalSec * 1000);

    // Gestione eventuale test match
    this._checkTestMatch();
  }

  /** Ferma il motore */
  stop() {
    this._running = false;
    if (this._persistTimer) clearInterval(this._persistTimer);
    if (this._logTimer) clearInterval(this._logTimer);

    this._pool.stop();
    this._persistState();
    console.log('[engine] Motore e pool fermati');
  }

  setCpuPercentage(percentage) {
    this._pool.setCpuPercentage(percentage);
    this._stats.setPoolStatus(this._pool.getStatus());
  }

  setDelay(delayMs) {
    config.spinDelayMs = delayMs;
    this._pool.setDelay(delayMs);
  }

  _handleMatch(matchData) {
    console.log('[engine] 🎉 MATCH TROVATO!', matchData);
    this._stats.recordMatch(matchData);
    this._notify.notifyMatch(matchData);
    this._persistState();
  }

  _persistState() {
    this._stats.setPoolStatus(this._pool.getStatus());
    this._persist.save(this._stats.serialize());
  }

  _checkPeriodicReport() {
    if (!config.pushoverReportDays || config.pushoverReportDays <= 0) return;
    const intervalMs = config.pushoverReportDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const lastReport = this._stats.lastReportTime || now;

    if (now - lastReport >= intervalMs) {
      this._sendProgressReport(now);
    }
  }

  _sendProgressReport(now) {
    this._stats.setLastReportTime(now);
    const s = this._stats.toJSON();
    const p = s.pool;
    this._notify.notifyProgressReport({
      totalSpins: s.totalSpins,
      spinsPerSecond: s.spinsPerSecond,
      cpuPercentage: p.cpuPercentage,
      activeWorkers: p.activeWorkers,
      totalCores: p.totalCores,
      formattedUptime: this._formatUptime(s.uptimeSeconds),
      cursorShort: s.lastPrivKeyShort,
      matchesCount: s.matchesCount,
    });
  }

  _logStatus() {
    this._stats.setPoolStatus(this._pool.getStatus());
    const s = this._stats.toJSON();
    const p = s.pool;
    console.log(
      `[engine] spins=${s.totalSpins} | ${s.spinsPerSecond} spin/s | ` +
      `threads=${p.activeWorkers}/${p.totalCores} (${p.cpuPercentage}%) | ` +
      `uptime=${this._formatUptime(s.uptimeSeconds)} | ` +
      `matches=${s.matchesCount}`
    );
  }

  _checkTestMatch() {
    if (config.testMatch && !this._testMatchDone) {
      this._testMatchDone = true;
      const fakeMatch = {
        timestamp: new Date().toISOString(),
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        privKeyHex: '0000000000000000000000000000000000000000000000000000000000000001',
        balanceSats: 5_000_000_000n,
      };
      console.log('[TEST] 🧪 Simulazione match di test...');
      this._handleMatch(fakeMatch);
    }
  }

  _formatUptime(totalSeconds) {
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  }
}
