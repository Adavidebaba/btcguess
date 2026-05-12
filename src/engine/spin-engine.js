/**
 * Motore di spin headless.
 * Esegue spin continui in background con delay configurabile.
 * Si appoggia alla funzione spin() originale della repo.
 */
import { spin } from '../game/spin.js';
import { deriveAll, randomPrivKey, bytesToHex } from '../game/crypto.js';
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
    this._currentSequentialKey = null;
  }

  /** Avvia il loop di spin */
  start() {
    if (this._running) return;
    this._running = true;
    console.log(`[engine] Avviato — delay: ${config.spinDelayMs}ms`);

    // Salvataggio periodico su disco
    this._persistTimer = setInterval(() => {
      this._persist.save(this._stats.serialize());
    }, config.persistIntervalSec * 1000);

    // Log periodico su console
    this._logTimer = setInterval(() => {
      const s = this._stats.toJSON();
      console.log(
        `[engine] spins=${s.totalSpins} | ${s.spinsPerSecond} spin/s | ` +
        `uptime=${this._formatUptime(s.uptimeSeconds)} | ` +
        `matches=${s.matchesCount}`
      );
    }, config.statsLogIntervalSec * 1000);

    // Avvia il loop
    this._loop();
  }

  /** Ferma il loop */
  stop() {
    this._running = false;
    if (this._persistTimer) clearInterval(this._persistTimer);
    if (this._logTimer) clearInterval(this._logTimer);
    // Salvataggio finale
    this._persist.save(this._stats.serialize());
    console.log('[engine] Fermato');
  }

  /** Loop principale */
  _loop() {
    if (!this._running) return;

    let result;

    // Test mode: forza un match al primo spin per verificare il salvataggio
    if (config.testMatch && !this._testMatchDone) {
      this._testMatchDone = true;
      const privKey = randomPrivKey();
      const derived = deriveAll(privKey);
      result = {
        win: true,
        privKey,
        privKeyHex: bytesToHex(privKey),
        derived,
        match: {
          hash160: derived.hash160Uncompressed,
          balanceSats: 5_000_000_000n, // 50 BTC (come genesis block)
        },
      };
      console.log('[TEST] 🧪 Match fittizio forzato per test!');
    } else {
      if (config.searchMode === 'sequential') {
        if (!this._currentSequentialKey) {
          this._currentSequentialKey = randomPrivKey();
        } else {
          this._currentSequentialKey = this._incrementPrivKey(this._currentSequentialKey);
        }
        result = spin(this._currentSequentialKey);
      } else {
        result = spin();
      }
    }

    this._stats.recordSpin(result);

    if (result.win) {
      const matchData = this._stats.toJSON().matches.at(-1);
      this._notify.notifyMatch(matchData);
      this._persist.save(this._stats.serialize());
    }

    if (config.spinDelayMs > 0) {
      setTimeout(() => this._loop(), config.spinDelayMs);
    } else {
      // setImmediate per non bloccare l'event loop (permette a Express di rispondere)
      setImmediate(() => this._loop());
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

  _incrementPrivKey(bytes) {
    const next = new Uint8Array(bytes);
    for (let i = 31; i >= 0; i--) {
      if (next[i] < 255) {
        next[i]++;
        break;
      }
      next[i] = 0;
    }
    return next;
  }
}
