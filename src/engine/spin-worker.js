/**
 * Worker thread autonomo ad altissima efficienza.
 * Esegue spin continui con partizionamento intercalato (striding) a zero duplicati.
 * Utilizza incremento in-place su Uint8Array per zero garbage collection overhead.
 */
import { parentPort, workerData } from 'node:worker_threads';
import { bytesToHex, hash160ToAddress } from '../game/crypto.js';
import { IncrementalDeriver } from '../game/incremental-derive.js';
import { checkHash160s, loadWalletMap } from '../game/wallets.js';


const SECP256K1_N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
const BATCH_SIZE = 500;

export class SpinWorker {
  constructor(port, initialData = {}) {
    this._port = port;
    this._workerId = initialData.workerId ?? 0;
    this._totalWorkers = Math.max(1, initialData.totalWorkers ?? 1);
    this._running = true;
    this._keyBytes = new Uint8Array(32);

    let baseKey = 1n;
    if (initialData.startKeyHex && initialData.startKeyHex.length === 64) {
      try {
        const parsed = BigInt('0x' + initialData.startKeyHex);
        if (parsed > 0n && parsed < SECP256K1_N) {
          baseKey = parsed;
        }
      } catch {
        baseKey = 1n;
      }
    }

    const currentKeyBigInt = (baseKey + BigInt(this._workerId)) % SECP256K1_N;
    this._bigIntToBytes(currentKeyBigInt === 0n ? 1n : currentKeyBigInt, this._keyBytes);
    this._step = this._totalWorkers;
    this._deriver = new IncrementalDeriver(this._keyBytes, this._step);


    this._pendingSpins = 0;
    this._lastReportTime = Date.now();

    try {
      loadWalletMap();
    } catch (err) {
      console.error(`[worker ${this._workerId}] Errore caricamento wallet map:`, err);
    }

    this._setupListener();
    this._loop();
  }

  _setupListener() {
    if (!this._port) return;
    this._port.on('message', (msg) => {
      if (msg.type === 'stop') {
        this._running = false;
        this._reportProgress();
      } else if (msg.type === 'reconfigure') {
        this._totalWorkers = Math.max(1, msg.totalWorkers);
        this._step = this._totalWorkers;
        this._workerId = msg.workerId;
        this._deriver.setStep(this._step);

      }
    });
  }

  /** Loop continuo autonomo ad alta velocità */
  _loop() {
    if (!this._running) return;

    try {
      while (this._running) {
        for (let i = 0; i < BATCH_SIZE; i++) {
          const derived = this._deriver.current();
          const hit = checkHash160s([derived.hash160Uncompressed, derived.hash160Compressed]);

          if (hit !== null) {
            this._reportMatch(hit, this._keyBytes);
          }

          this._deriver.next();

        }

        this._pendingSpins += BATCH_SIZE;

        const now = Date.now();
        if (now - this._lastReportTime >= 500) {
          this._reportProgress();
          this._lastReportTime = now;
          break; // Cede il controllo all'event loop per ricevere eventuali comandi
        }
      }
    } catch (err) {
      console.error(`[worker ${this._workerId}] Errore durante lo spin:`, err);
      this._deriver.next();

    }

    if (this._running) {
      setImmediate(() => this._loop());
    }
  }

  _reportProgress() {
    if (this._pendingSpins > 0 && this._port) {
      try {
        this._port.postMessage({
          type: 'progress',
          workerId: this._workerId,
          spinsCount: this._pendingSpins,
          lastKeyHex: bytesToHex(this._keyBytes),
        });
      } catch (err) {
        console.error(`[worker ${this._workerId}] Errore invio progresso:`, err);
      }
      this._pendingSpins = 0;
    }
  }

  _reportMatch(hit, privKeyBytes) {
    const privKeyHex = bytesToHex(privKeyBytes);
    const address = hash160ToAddress(hit.hash160);
    if (this._port) {
      this._port.postMessage({
        type: 'match',
        workerId: this._workerId,
        match: {
          ...hit,
          address,
          privKeyHex,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  _bigIntToBytes(val, out) {

    let temp = val;
    for (let i = 31; i >= 0; i--) {
      out[i] = Number(temp & 0xFFn);
      temp >>= 8n;
    }
  }
}

if (parentPort) {
  new SpinWorker(parentPort, workerData);
}
