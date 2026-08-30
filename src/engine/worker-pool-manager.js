/**
 * Gestore del pool di Worker Threads ad altissima efficienza.
 * Utilizza partizionamento a passi intercalati (striding) su tutti i worker attivi.
 */
import { Worker } from 'node:worker_threads';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { randomPrivKey, bytesToHex } from '../game/crypto.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKER_PATH = resolve(__dirname, 'spin-worker.js');
const SECP256K1_N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
const MAX_KEY_SPACE = SECP256K1_N - 1n;

export class WorkerPoolManager {
  constructor({ statsManager, onMatch, defaultPercentage = 100 }) {
    this._stats = statsManager;
    this._onMatch = onMatch;

    this._totalCores = typeof os.availableParallelism === 'function'
      ? os.availableParallelism()
      : os.cpus().length;

    this._cpuPercentage = Math.min(100, Math.max(1, defaultPercentage));
    this._workers = []; // array of Worker instances
    this._running = false;
    this._cursorBigInt = this._generateInitialCursor();
  }

  get totalCores() {
    return this._totalCores;
  }

  get activeWorkersCount() {
    return this._workers.length;
  }

  get cpuPercentage() {
    return this._cpuPercentage;
  }

  get cursorHex() {
    return this._bigIntToHex(this._cursorBigInt);
  }

  setCursorHex(hex) {
    if (hex && hex.length === 64) {
      const val = BigInt('0x' + hex);
      if (val > 0n && val <= MAX_KEY_SPACE) {
        this._cursorBigInt = val;
      }
    }
  }

  /** Avvia il pool di worker */
  start() {
    if (this._running) return;
    this._running = true;
    const targetCount = this._calculateWorkerCount(this._cpuPercentage);
    this._launchPool(targetCount);
    console.log(`[pool] Avviato a massima efficienza con ${this._workers.length}/${this._totalCores} thread (${this._cpuPercentage}%)`);
  }

  /** Ferma tutti i worker */
  stop() {
    this._running = false;
    this._terminateAll();
    console.log('[pool] Tutti i worker sono stati arrestati');
  }

  /** Scala la percentuale CPU a caldo riavviando i thread con il nuovo passo */
  setCpuPercentage(percentage) {
    const newPercent = Math.min(100, Math.max(1, percentage));
    if (newPercent === this._cpuPercentage && this._running) return;

    this._cpuPercentage = newPercent;
    if (this._running) {
      const targetCount = this._calculateWorkerCount(this._cpuPercentage);
      this._terminateAll();
      this._launchPool(targetCount);
      console.log(`[pool] Scalato a ${this._workers.length}/${this._totalCores} thread (${this._cpuPercentage}%)`);
    }
  }

  _calculateWorkerCount(percentage) {
    const count = Math.round(this._totalCores * (percentage / 100));
    return Math.max(1, Math.min(this._totalCores, count));
  }

  _launchPool(count) {
    this._workers = [];
    const startKeyHex = this.cursorHex;

    for (let i = 0; i < count; i++) {
      const worker = new Worker(WORKER_PATH, {
        workerData: {
          workerId: i,
          totalWorkers: count,
          startKeyHex,
        },
        execArgv: [],
      });

      worker.on('message', (msg) => this._handleWorkerMessage(msg));
      worker.on('error', (err) => console.error(`[pool] Errore worker ${i}:`, err));
      this._workers.push(worker);
    }
  }

  _terminateAll() {
    for (const worker of this._workers) {
      try {
        worker.postMessage({ type: 'stop' });
        worker.terminate();
      } catch {
        // Ignora
      }
    }
    this._workers = [];
  }

  _handleWorkerMessage(msg) {
    if (msg.type === 'progress') {
      this._stats.recordBatch({
        spinsCount: msg.spinsCount,
        lastKeyHex: msg.lastKeyHex,
      });
      if (msg.lastKeyHex) {
        this._cursorBigInt = BigInt('0x' + msg.lastKeyHex);
      }
    } else if (msg.type === 'match') {
      if (typeof this._onMatch === 'function') {
        this._onMatch(msg.match);
      }
    }
  }

  _generateInitialCursor() {
    let key;
    do {
      key = BigInt('0x' + bytesToHex(randomPrivKey()));
    } while (key === 0n || key >= SECP256K1_N);
    return key;
  }

  _bigIntToHex(b) {
    return b.toString(16).padStart(64, '0');
  }

  getStatus() {
    return {
      totalCores: this._totalCores,
      activeWorkers: this._workers.length,
      cpuPercentage: this._cpuPercentage,
      currentCursor: this.cursorHex,
    };
  }
}
