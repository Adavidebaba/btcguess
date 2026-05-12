/**
 * Gestisce le statistiche degli spin in tempo reale.
 * Mantiene contatori, calcola spin/sec, traccia match.
 */
const SATS_PER_BTC = 100_000_000;

export class StatsManager {
  constructor() {
    this._totalSpins = 0n;
    this._startTime = Date.now();
    this._lastSpinTime = 0;
    this._lastAddress = '';
    this._lastPrivKeyHex = '';
    this._matches = [];
    this._spinWindow = [];
    this._windowDurationMs = 10_000;
  }

  /** Registra uno spin completato */
  recordSpin(result) {
    this._totalSpins++;
    this._lastSpinTime = Date.now();
    this._lastAddress = result.derived.addressUncompressed;
    this._lastPrivKeyHex = result.privKeyHex;
    this._spinWindow.push(this._lastSpinTime);
    this._pruneWindow();

    if (result.win) {
      this._matches.push({
        timestamp: new Date().toISOString(),
        address: result.derived.addressUncompressed,
        privKeyHex: result.privKeyHex,
        balanceBtc: Number(result.match.balanceSats) / SATS_PER_BTC,
      });
    }
  }

  /** Calcola spin/sec nella finestra temporale */
  _pruneWindow() {
    const cutoff = Date.now() - this._windowDurationMs;
    while (this._spinWindow.length > 0 && this._spinWindow[0] < cutoff) {
      this._spinWindow.shift();
    }
  }

  get spinsPerSecond() {
    this._pruneWindow();
    if (this._spinWindow.length < 2) return 0;
    const elapsed = this._spinWindow[this._spinWindow.length - 1] - this._spinWindow[0];
    if (elapsed === 0) return 0;
    return Math.round((this._spinWindow.length / elapsed) * 1000);
  }

  get uptimeSeconds() {
    return Math.floor((Date.now() - this._startTime) / 1000);
  }

  /** Snapshot per API / dashboard */
  toJSON() {
    return {
      totalSpins: this._totalSpins.toString(),
      spinsPerSecond: this.spinsPerSecond,
      uptimeSeconds: this.uptimeSeconds,
      startTime: new Date(this._startTime).toISOString(),
      lastSpinTime: this._lastSpinTime
        ? new Date(this._lastSpinTime).toISOString()
        : null,
      lastAddress: this._lastAddress,
      lastPrivKeyShort: this._lastPrivKeyHex
        ? `${this._lastPrivKeyHex.slice(0, 8)}…${this._lastPrivKeyHex.slice(-8)}`
        : '',
      matchesCount: this._matches.length,
      matches: this._matches,
    };
  }

  /** Per il persistence manager — salva lo stato completo */
  serialize() {
    return {
      totalSpins: this._totalSpins.toString(),
      startTime: this._startTime,
      matches: this._matches,
    };
  }

  /** Ripristina lo stato dal persistence manager */
  restore(data) {
    if (!data) return;
    this._totalSpins = BigInt(data.totalSpins ?? '0');
    // Mantieni lo startTime originale per tracciare uptime reale della sessione,
    // ma salva totalSpins cumulativo tra riavvii
    this._matches = data.matches ?? [];
  }
}
